import { Routes } from '@angular/router';
import { authGuard } from '../shared/guards/auth-guard';
import { roleGuard } from '../shared/guards/role-guard';
import { UserManagement } from './user-management/user-management';
import { UserForm } from './user-form/user-form';

export const ADMIN_ROUTES: Routes = [
  {
    path: '',
    component: UserManagement,
    canActivate: [authGuard, roleGuard],
    data: { role: 'ADMIN' }
  },
  {
    path: 'new',
    component: UserForm,
    canActivate: [authGuard, roleGuard],
    data: { role: 'ADMIN' }
  }
];
