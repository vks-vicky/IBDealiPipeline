import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule, NavigationEnd } from '@angular/router';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatListModule } from '@angular/material/list';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatMenuModule } from '@angular/material/menu';
import { MatDividerModule } from '@angular/material/divider';
import { MatTooltipModule } from '@angular/material/tooltip';
import { AuthService, User } from '../../core/services/auth';
import { filter } from 'rxjs/operators';

interface NavItem {
  label: string;
  icon: string;
  route: string;
  roles: string[];
}

@Component({
  standalone: true,
  selector: 'app-layout',
  imports: [
    CommonModule,
    RouterModule,
    MatToolbarModule,
    MatSidenavModule,
    MatListModule,
    MatIconModule,
    MatButtonModule,
    MatMenuModule,
    MatDividerModule,
    MatTooltipModule
  ],
  templateUrl: './layout.html',
  styleUrl: './layout.scss'
})
export class Layout implements OnInit {
  
  userRole: string | null = null;
  currentUser: User | null = null;
  isSidenavOpen = true;
  currentPageTitle = 'Deal Pipeline';

  navItems: NavItem[] = [
    { label: 'Deal Pipeline', icon: 'business_center', route: '/deals', roles: ['USER', 'ADMIN'] },
    { label: 'User Management', icon: 'people', route: '/admin', roles: ['ADMIN'] }
  ];

  constructor(
    private authService: AuthService,
    private router: Router
  ) {
    // Listen to route changes to update page title
    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd)
    ).subscribe(() => {
      this.updatePageTitle();
    });
  }

  ngOnInit() {
    this.userRole = this.authService.getRole();
    this.loadCurrentUser();
    this.updatePageTitle();
  }

  loadCurrentUser() {
    this.authService.getCurrentUser().subscribe({
      next: (user) => {
        this.currentUser = user;
        console.log('Current user loaded:', user);
      },
      error: (error) => {
        console.error('Error loading current user:', error);
      }
    });
  }

  getUserInitials(): string {
    if (!this.currentUser) return 'U';
    return this.currentUser.username.charAt(0).toUpperCase();
  }

  updatePageTitle() {
    const currentUrl = this.router.url;
    const matchedItem = this.navItems.find(item => 
      currentUrl.includes(item.route)
    );
    this.currentPageTitle = matchedItem ? matchedItem.label : 'Deal Pipeline';
  }

  get filteredNavItems() {
    return this.navItems.filter(item => 
      item.roles.includes(this.userRole || '')
    );
  }

  toggleSidenav() {
    this.isSidenavOpen = !this.isSidenavOpen;
  }

  logout() {
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}
