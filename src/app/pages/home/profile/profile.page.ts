import { Component, OnInit, ViewChild } from '@angular/core';
import { Store, select } from '@ngrx/store';
import { Router } from '@angular/router';
import { Observable, Subscription } from 'rxjs';
import { IonModal, ToastController } from '@ionic/angular';

// Interfaces Imports
import { User } from 'src/app/models/User';
import { Account } from 'src/app/models/Account';
import { ErrorInterface } from 'src/app/models/types/errors/error.interface';

// Actions Imports
import { getCurrentUserAction } from 'src/app/store/actions/user.action';
import {
  clearErrorsAction,
  logoutAction,
} from 'src/app/store/actions/auth.action';

// Selectors Imports
import {
  accountSelector,
  currentUserSelector,
  profileErrorSelector,
} from 'src/app/store/selectors/auth.selector';

@Component({
  selector: 'app-profile',
  templateUrl: './profile.page.html',
  styleUrls: ['./profile.page.scss'],
})
export class ProfilePage implements OnInit {
  @ViewChild(IonModal) modal: IonModal;

  public appPages = [
    {
      title: 'Account',
      url: 'account',
      icon: 'person-circle-outline',
      detail: true,
    },
    {
      title: 'Edit Profile',
      url: 'edit',
      icon: 'create-outline',
      detail: true,
    },
    {
      title: 'Notifications',
      url: 'notifications',
      icon: 'notifications-outline',
      detail: true,
    },
    {
      title: 'Privacy',
      url: 'privacy',
      icon: 'shield-checkmark-outline',
      detail: true,
    },
    {
      title: 'Appearance',
      url: 'appearance',
      icon: 'contrast-outline',
      detail: true,
    },
    {
      title: 'Our Kitchen',
      url: 'about-us',
      icon: 'code-slash-outline',
      detail: true,
      new: true,
    },
    { title: 'Logout', url: 'logout', icon: 'log-out-outline', detail: false },
  ];

  subscription: Subscription;

  currentUserId: string | null = null;
  currentUser$: Observable<User | null> = null;
  account$: Observable<Account | null> = null;

  constructor(
    private store: Store,
    private router: Router,
    private toastController: ToastController
  ) {}

  ngOnInit() {
    this.initValues();
  }

  ionViewWillEnter() {
    this.subscription = new Subscription();

    // Set currentUser
    this.subscription.add(
      this.currentUser$.subscribe((user) => {
        this.currentUserId = user?.$id;
      })
    );

    // Profile Error Handling
    this.subscription.add(
      this.store
        .pipe(select(profileErrorSelector))
        .subscribe((error: ErrorInterface) => {
          if (error && error.message) {
            this.presentToast(error.message, 'danger');
            this.store.dispatch(clearErrorsAction());
          }
        })
    );
  }

  ionViewWillLeave() {
    // Unsubscribe from all subscriptions
    this.subscription.unsubscribe();
  }

  initValues() {
    this.currentUser$ = this.store.pipe(select(currentUserSelector));
    this.account$ = this.store.pipe(select(accountSelector));
  }

  getSettingPage(page) {
    if (page?.url == 'logout') {
      this.logout();
      this.dismissModal();
      return;
    }
    this.dismissModal();
    this.router.navigate(['/', 'home', page?.url]);
  }

  async logout() {
    this.store.dispatch(logoutAction());
  }

  editProfile() {
    this.router.navigate(['/', 'home', 'edit']);
  }

  dismissModal() {
    this.modal.dismiss();
  }

  handleRefresh(event) {
    this.store.dispatch(getCurrentUserAction({ userId: this.currentUserId }));
    this.initValues();
    event.target.complete();
  }

  //
  // Go to other pages
  //

  publicProfileView() {
    this.router.navigate(['/', 'home', 'user', this.currentUserId]);
  }

  getVisitorsPage() {
    this.router.navigate(['/', 'home', 'visitors']);
  }

  //
  // Present Toast
  //

  async presentToast(msg: string, color?: string) {
    const toast = await this.toastController.create({
      message: msg,
      color: color || 'primary',
      duration: 1000,
      position: 'top',
    });

    await toast.present();
  }
}
