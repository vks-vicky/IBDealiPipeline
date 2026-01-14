import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { UserService } from '../../core/services/user';

@Component({
  standalone: true,
  selector: 'app-user-management',
  imports: [CommonModule, RouterModule, MatTableModule, MatButtonModule],
  templateUrl: './user-management.html'
})
export class UserManagement implements OnInit {

  users: any[] = [];
  columns = ['username', 'email', 'role', 'active', 'actions'];

  constructor(private usersApi: UserService) {}

  ngOnInit() {
    this.load();
  }

  load() {
    this.usersApi.getAll().subscribe(u => this.users = u);
  }

  toggle(u: any) {
    this.usersApi.updateStatus(u.id, !u.active)
      .subscribe(() => this.load());
  }
}
