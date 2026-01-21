import { Component, OnInit, ChangeDetectorRef, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatChipsModule } from '@angular/material/chips';
import { MatMenuModule } from '@angular/material/menu';
import { MatSelectModule } from '@angular/material/select';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { UserService } from '../../core/services/user';
import { UserForm } from '../user-form/user-form';

@Component({
  standalone: true,
  selector: 'app-user-management',
  imports: [
    CommonModule, 
    RouterModule, 
    FormsModule,
    MatTableModule, 
    MatButtonModule,
    MatIconModule,
    MatInputModule,
    MatChipsModule,
    MatMenuModule,
    MatDialogModule,
    MatSelectModule,
    MatSlideToggleModule
  ],
  templateUrl: './user-management.html',
  styleUrl: './user-management.scss'
})
export class UserManagement implements OnInit, AfterViewInit {

  users: any[] = [];
  filteredUsers: any[] = [];
  paginatedUsers: any[] = [];
  searchTerm = '';
  selectedRole = 'ALL';
  selectedStatus = 'ALL';
  columns = ['username', 'email', 'role', 'active', 'actions'];
  
  // Pagination
  currentPage = 1;
  pageSize = 10;
  totalUsers = 0;

  constructor(
    private usersApi: UserService,
    private dialog: MatDialog,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {
    console.log('UserManagement component initialized');
    this.load();
  }

  ngAfterViewInit() {
    // Ensure view is updated after initial load
    this.cdr.detectChanges();
  }

  load() {
    this.usersApi.getAll().subscribe({
      next: (u) => {
        console.log('Users loaded:', u);
        this.users = u || [];
        this.filterUsers();
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Error loading users:', err);
        this.users = [];
        this.filteredUsers = [];
        this.paginatedUsers = [];
        this.totalUsers = 0;
        this.cdr.detectChanges();
      }
    });
  }

  filterUsers() {
    let filtered = [...this.users];
    
    // Search filter
    if (this.searchTerm) {
      const term = this.searchTerm.toLowerCase();
      filtered = filtered.filter(user => 
        user.username?.toLowerCase().includes(term) ||
        user.email?.toLowerCase().includes(term) ||
        user.role?.toLowerCase().includes(term)
      );
    }
    
    // Role filter
    if (this.selectedRole !== 'ALL') {
      filtered = filtered.filter(user => user.role === this.selectedRole);
    }
    
    // Status filter
    if (this.selectedStatus !== 'ALL') {
      const isActive = this.selectedStatus === 'ACTIVE';
      filtered = filtered.filter(user => user.active === isActive);
    }
    
    this.filteredUsers = filtered;
    this.totalUsers = filtered.length;
    this.currentPage = 1;
    this.updatePagination();
    console.log('Filtered users:', filtered.length, 'Paginated:', this.paginatedUsers.length);
  }
  
  updatePagination() {
    const startIndex = (this.currentPage - 1) * this.pageSize;
    const endIndex = startIndex + this.pageSize;
    this.paginatedUsers = this.filteredUsers.slice(startIndex, endIndex);
    this.cdr.markForCheck();
  }
  
  get totalPages(): number {
    return Math.ceil(this.totalUsers / this.pageSize);
  }
  
  get startIndex(): number {
    return (this.currentPage - 1) * this.pageSize + 1;
  }
  
  get endIndex(): number {
    return Math.min(this.currentPage * this.pageSize, this.totalUsers);
  }
  
  goToPage(page: number) {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
      this.updatePagination();
    }
  }
  
  nextPage() {
    if (this.currentPage < this.totalPages) {
      this.currentPage++;
      this.updatePagination();
    }
  }
  
  previousPage() {
    if (this.currentPage > 1) {
      this.currentPage--;
      this.updatePagination();
    }
  }
  
  clearFilters() {
    this.searchTerm = '';
    this.selectedRole = 'ALL';
    this.selectedStatus = 'ALL';
    this.filterUsers();
  }

  openCreateUserDialog() {
    const dialogRef = this.dialog.open(UserForm, {
      width: '600px',
      disableClose: true,
      panelClass: 'custom-dialog'
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        // User was created successfully, reload the list
        this.load();
      }
    });
  }

  toggle(u: any) {
    this.usersApi.updateStatus(u.id, !u.active)
      .subscribe(() => this.load());
  }

  trackByUserId(index: number, user: any): any {
    return user.id || index;
  }
}
