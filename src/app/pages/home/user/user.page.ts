import { Component, OnInit, ViewChild } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Store, select } from '@ngrx/store';
import { Browser } from '@capacitor/browser';
import { BehaviorSubject, Observable, Subscription, filter, take } from 'rxjs';
import {
  IonModal,
  LoadingController,
  ModalController,
  ToastController,
} from '@ionic/angular';

import { environment } from 'src/environments/environment';
import { getAge, lastSeen } from 'src/app/extras/utils';
import { PreviewPhotoComponent } from 'src/app/components/preview-photo/preview-photo.component';
import { Language } from 'src/app/models/Language';
import { User } from 'src/app/models/User';
import { ErrorInterface } from 'src/app/models/types/errors/error.interface';
import { getUserByIdAction } from 'src/app/store/actions/user.action';
import {
  isLoadingSelector,
  userSelector,
} from 'src/app/store/selectors/user.selector';
import {
  blockUserAction,
  blockUserInitialStateAction,
} from 'src/app/store/actions/auth.action';
import {
  blockUserErrorSelector,
  blockUserSuccessSelector,
  currentUserSelector,
} from 'src/app/store/selectors/auth.selector';

@Component({
  selector: 'app-user',
  templateUrl: './user.page.html',
  styleUrls: ['./user.page.scss'],
})
export class UserPage implements OnInit {
  @ViewChild('reportUserModal') reportUserModal: IonModal;
  @ViewChild('blockUserModal') blockUserModal: IonModal;

  subscription: Subscription;

  userId: string;
  user$: Observable<User>;
  currentUser$: Observable<User>;

  studyLanguages: Language[] = [];
  motherLanguages: Language[] = [];
  gender: string = null;
  profilePhoto: URL = null;
  otherPhotos: URL[] = [];
  badges: string[] = [];

  reason: string;

  constructor(
    private store: Store,
    private route: ActivatedRoute,
    private modalCtrl: ModalController,
    private toastController: ToastController,
    private loadingCtrl: LoadingController
  ) {}

  async ngOnInit() {
    this.initValues();
  }

  ionViewWillEnter() {
    this.subscription = new Subscription();

    // Loading
    this.subscription.add(
      this.store.pipe(select(isLoadingSelector)).subscribe((isLoading) => {
        this.loadingController(isLoading);
      })
    );

    // Present Toast if error
    this.subscription.add(
      this.store
        .pipe(select(blockUserErrorSelector))
        .subscribe((error: ErrorInterface) => {
          if (error) {
            this.presentToast(error.message, 'danger');
          }
        })
    );

    // Present Toast if user has been blocked successfully
    this.subscription.add(
      this.store
        .pipe(select(blockUserSuccessSelector))
        .subscribe((success: boolean) => {
          if (success) {
            this.presentToast('The user has been blocked.', 'danger');
            this.store.dispatch(blockUserInitialStateAction());
          }
        })
    );
  }

  ionViewWillLeave() {
    this.isLoadingOverlayActive
      .pipe(
        filter((isActive) => !isActive),
        take(1)
      )
      .subscribe(async () => {
        if (this.loadingOverlay) {
          await this.loadingOverlay.dismiss();
          this.loadingOverlay = undefined;
        }
      });
    // Unsubscribe from all subscriptions
    this.subscription.unsubscribe();
  }

  initValues() {
    this.userId = this.route.snapshot.paramMap.get('id') || null;
    this.user$ = this.store.pipe(select(userSelector));
    this.currentUser$ = this.store.pipe(select(currentUserSelector));

    // Get User By userId
    this.store.dispatch(getUserByIdAction({ userId: this.userId }));

    // Set User
    this.user$.subscribe((user) => {
      this.studyLanguages = user?.languages.filter(
        (lang) => !lang.motherLanguage
      );
      this.motherLanguages = user?.languages.filter(
        (lang) => lang.motherLanguage
      );
      this.gender =
        user?.gender.charAt(0).toUpperCase() + user?.gender.slice(1);
      this.profilePhoto = user?.profilePhoto;
      this.otherPhotos = user?.otherPhotos;
      this.badges = user?.badges.map(
        (badge) => `/assets/image/badges/${badge}.png`
      );
    });
  }

  async openPreview(photos) {
    console.log(photos);
    const modal = await this.modalCtrl.create({
      component: PreviewPhotoComponent,
      componentProps: {
        photos: photos,
      },
    });
    modal.present();
  }

  //
  // Report User
  //

  reportUser(reason: string) {
    console.log('reason: ', reason);

    this.reportUserModal.dismiss();
    // this.currentUser$
    //   .subscribe((currentUser) => {
    //     if (currentUser.reportedUsers.includes(this.userId)) {
    //       this.presentToast('User already reported.', 'danger');
    //     } else if (currentUser.$id === this.userId) {
    //       this.presentToast('You cannot report yourself.', 'danger');
    //     } else {
    //       const request = { userId: this.userId, reason: reason };
    //       // Dispatch the action to update current user
    //       this.store.dispatch(reportUserAction({ request }));
    //     }
    //   })
    //   .unsubscribe();
  }

  //
  // Block User
  //

  blockUser() {
    this.blockUserModal.dismiss();
    this.currentUser$
      .subscribe((currentUser) => {
        if (currentUser.blockedUsers.includes(this.userId)) {
          this.presentToast('User already blocked.', 'danger');
        } else if (currentUser.$id === this.userId) {
          this.presentToast('You cannot block yourself.', 'danger');
        } else {
          const request = { userId: this.userId };
          // Dispatch the action to update current user
          this.store.dispatch(blockUserAction({ request }));
        }
      })
      .unsubscribe();
  }

  async openTermsAndPolicyLink() {
    await Browser.open({ url: environment.web.TERMS_AND_CONDITIONS_URL });
  }

  //
  // Utils
  //

  lastSeen(d: any) {
    if (!d) return null;
    return lastSeen(d);
  }

  getAge(d: any) {
    if (!d) return null;
    return getAge(d);
  }

  //
  // Present Toast
  //

  async presentToast(msg: string, color?: string) {
    const toast = await this.toastController.create({
      message: msg,
      color: color || 'primary',
      duration: 1500,
      position: 'bottom',
    });

    await toast.present();
  }

  //
  // Loading Controller
  //

  private loadingOverlay: HTMLIonLoadingElement;
  private isLoadingOverlayActive = new BehaviorSubject<boolean>(false);
  async loadingController(isLoading: boolean) {
    if (isLoading) {
      if (!this.loadingOverlay) {
        this.isLoadingOverlayActive.next(true);
        this.loadingOverlay = await this.loadingCtrl.create({
          message: 'Please wait...',
        });
        await this.loadingOverlay.present();
        this.isLoadingOverlayActive.next(false);
      }
    } else if (this.loadingOverlay) {
      this.isLoadingOverlayActive.next(true);
      await this.loadingOverlay.dismiss();
      this.loadingOverlay = undefined;
      this.isLoadingOverlayActive.next(false);
    }
  }
}
