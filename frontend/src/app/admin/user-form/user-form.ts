import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatSelectModule } from '@angular/material/select';
import { UserService } from '../../core/services/user';

@Component({
  standalone: true,
  selector: 'app-user-form',
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatCardModule,
    MatInputModule,
    MatButtonModule,
    MatSelectModule
  ],
  templateUrl: './user-form.html'
})
export class UserForm implements OnInit {

  form!: ReturnType<FormBuilder['group']>;

  constructor(
    private fb: FormBuilder,
    private usersApi: UserService,
    private router: Router
  ) {}

  ngOnInit() {
    this.form = this.fb.group({
      username: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      password: ['', Validators.required],
      role: ['USER', Validators.required]
    });
  }

  submit() {
    if (this.form.invalid) return;

    this.usersApi.create(this.form.value).subscribe(() => {
      this.router.navigate(['/admin']);
    });
  }
}
