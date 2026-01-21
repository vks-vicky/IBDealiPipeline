import { Routes } from '@angular/router';
import { Layout } from './shared/layout/layout';

export const routes: Routes = [
    {
        path: 'login',
        loadChildren: () =>
            import('./auth/auth.routes').then(m => m.AUTH_ROUTES)
    },
    {
        path: '',
        component: Layout,
        children: [
            {
                path: 'deals',
                loadChildren: () =>
                    import('./deals/deals.routes').then(m => m.DEALS_ROUTES)
            },
            {
                path: 'admin',
                loadChildren: () =>
                    import('./admin/admin.routes').then(m => m.ADMIN_ROUTES)
            },
            {
                path: '',
                redirectTo: 'login',
                pathMatch: 'full'
            }
        ]
    }
];
