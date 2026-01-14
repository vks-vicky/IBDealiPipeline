import { Routes } from '@angular/router';
import { authGuard } from '../shared/guards/auth-guard';
import { DealList } from './deal-list/deal-list';
import { DealForm } from './deal-form/deal-form';
import { DealDetail } from './deal-detail/deal-detail';

export const DEALS_ROUTES: Routes = [
  {
    path: '',
    component: DealList,
    canActivate: [authGuard]
  },
  {
    path: 'new',
    component: DealForm,
    canActivate: [authGuard]
  },
  {
    path: ':id/edit',
    component: DealForm,
    canActivate: [authGuard]
  },

  {
    path: ':id',
    component: DealDetail,
    canActivate: [authGuard]
  }
];
