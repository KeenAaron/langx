import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { Router } from '@angular/router';
import { ToastController } from '@ionic/angular';
import { Store, select } from '@ngrx/store';
import { Observable, Subscription } from 'rxjs';

// Interface Imports
import { User } from 'src/app/models/User';
import { FilterDataInterface } from 'src/app/models/types/filterData.interface';
import { ErrorInterface } from 'src/app/models/types/errors/error.interface';

// Service Imports
import { StorageService } from 'src/app/services/storage/storage.service';
import { FilterService } from 'src/app/services/filter/filter.service';

// Action Imports
import { createRoomInitialStateAction } from 'src/app/store/actions/room.action';
import { getVisitsAction } from 'src/app/store/actions/visits.action';
import {
  getUsersByCompletedProfileAction,
  getUsersByCreatedAtAction,
  getUsersByLastSeenAction,
  getUsersByTargetLanguageAction,
} from 'src/app/store/actions/users.action';
import { clearErrorsAction } from 'src/app/store/actions/user.action';

// Selector Imports
import { currentUserSelector } from 'src/app/store/selectors/auth.selector';
import { createRoomErrorSelector } from 'src/app/store/selectors/room.selector';
import {
  usersByLastSeenSelector,
  errorSelector,
  usersByCreatedAtSelector,
  usersByTargetLanguageSelector,
  usersByCompletedProfileSelector,
} from 'src/app/store/selectors/user.selector';

@Component({
  selector: 'app-community',
  templateUrl: './community.page.html',
  styleUrls: ['./community.page.scss'],
})
export class CommunityPage implements OnInit {
  subscription: Subscription;

  segment: string = 'usersByTargetLanguage';

  filter$: any;
  filterData: FilterDataInterface;

  currentUser$: Observable<User>;

  isLoadingByTargetLanguage$: Observable<boolean>;
  isLoadingByCompletedProfile$: Observable<boolean>;
  isLoadingByLastSeen$: Observable<boolean>;
  isLoadingByCreatedAt$: Observable<boolean>;
  usersByTargetLanguage$: Observable<User[] | null> = null;
  usersByCompletedProfile$: Observable<User[] | null> = null;
  usersByLastSeen$: Observable<User[] | null> = null;
  usersByCreatedAt$: Observable<User[] | null> = null;

  constructor(
    private store: Store,
    private router: Router,
    private cdr: ChangeDetectorRef,
    private filterService: FilterService,
    private storageService: StorageService,
    private toastController: ToastController
  ) {}

  async ngOnInit() {
    // Init values
    this.initValues();

    // Check Local Storage for filters
    await this.checkLocalStorage();
    await this.checkFilter();
  }

  ionViewWillEnter() {
    this.subscription = new Subscription();

    // User Errors
    this.subscription.add(
      this.store
        .pipe(select(errorSelector))
        .subscribe((error: ErrorInterface) => {
          if (error) {
            this.presentToast(error.message, 'danger');
            this.store.dispatch(clearErrorsAction());
          }
        })
    );

    this.subscription.add(
      this.store
        .pipe(select(createRoomErrorSelector))
        .subscribe((error: ErrorInterface) => {
          if (error) {
            this.presentToast(error.message, 'danger');
            // Clear the error state
            this.store.dispatch(createRoomInitialStateAction());
          }
        })
    );
  }

  ionViewWillLeave() {
    // Unsubscribe from all subscriptions
    this.subscription.unsubscribe();
  }

  ngOnDestroy() {
    this.filter$.unsubscribe();
    // console.log('filters unsubscribed');
  }

  initValues(): void {
    // Set values from selectors
    this.currentUser$ = this.store.pipe(select(currentUserSelector));
    this.usersByTargetLanguage$ = this.store.pipe(
      select(usersByTargetLanguageSelector)
    );
    this.usersByCompletedProfile$ = this.store.pipe(
      select(usersByCompletedProfileSelector)
    );
    this.usersByLastSeen$ = this.store.pipe(select(usersByLastSeenSelector));
    this.usersByCreatedAt$ = this.store.pipe(select(usersByCreatedAtSelector));
  }

  //
  // Segments
  //

  segmentChanged(event: any) {
    this.segment = event.detail.value;
    this.cdr.detectChanges();
  }

  //
  // Get Users
  //

  listUsersByTargetLanguage() {
    const filterData = this.filterData;
    this.store.dispatch(
      getUsersByTargetLanguageAction({ request: { filterData } })
    );
  }

  listUsersByCompletedProfile() {
    const filterData = this.filterData;
    this.store.dispatch(
      getUsersByCompletedProfileAction({ request: { filterData } })
    );
  }

  listUsersByLastSeen() {
    const filterData = this.filterData;
    this.store.dispatch(getUsersByLastSeenAction({ request: { filterData } }));
  }

  listUsersByCreatedAt() {
    const filterData = this.filterData;
    this.store.dispatch(getUsersByCreatedAtAction({ request: { filterData } }));
  }

  listVisits() {
    this.store.dispatch(getVisitsAction());
  }

  listAllUsers() {
    this.listUsersByTargetLanguage();
    this.listUsersByCompletedProfile();
    this.listUsersByLastSeen();
    this.listUsersByCreatedAt();
    this.listVisits();
  }

  //
  // Check Filter
  //

  async checkFilter() {
    this.filter$ = this.filterService
      .getEvent()
      .subscribe((filterData: FilterDataInterface) => {
        this.filterData = filterData;
        // console.log('Subscribed filter: ', filterData);

        // List Users
        this.listAllUsers();
      });
  }

  // TODO: #246 Save filterData with JSON.stringify();
  async checkLocalStorage() {
    // Getting the filter data from Capacitor Preferences
    let languagesString =
      (await this.storageService.getValue('languages')) || [];
    const gender = (await this.storageService.getValue('gender')) || null;
    const country = (await this.storageService.getValue('country')) || null;
    const minAgeString = (await this.storageService.getValue('minAge')) || null;
    const maxAgeString = (await this.storageService.getValue('maxAge')) || null;

    let minAge = Number(minAgeString) || null;
    let maxAge = Number(maxAgeString) || null;

    // TODO: Do better logic here
    let languages: Array<any> = [];
    if (languagesString) {
      languages = languagesString.toLocaleString().split(',');
      if (languages.length === 1 && languages[0] === '') {
        languages = [];
      }
    }

    let filterData: FilterDataInterface = {
      languages: languages,
      gender: gender,
      country: country,
      minAge: minAge,
      maxAge: maxAge,
    };

    // console.log('checkLocalStorage', filterData);
    this.filterService.setEvent(filterData);
  }

  //
  // Pull to refresh
  //

  handleRefresh(event) {
    // List Users
    this.listAllUsers();
    if (event) event.target.complete();
  }

  //
  // Routes
  //

  getFiltersPage() {
    this.router.navigateByUrl('/home/filters');
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
