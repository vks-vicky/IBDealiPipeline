import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { DealService } from '../../core/services/deal';
import { AuthService } from '../../core/services/auth';

@Component({
  standalone: true,
  selector: 'app-deal-form',
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatCardModule,
    MatInputModule,
    MatButtonModule,
    RouterModule
  ],
  templateUrl: './deal-form.html'
})

export class DealForm implements OnInit {

  isEdit = false;
  isAdmin = false;
  dealId?: string;

  form!: ReturnType<FormBuilder['group']>;

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private router: Router,
    private deals: DealService,
    private auth: AuthService
  ) {}

  ngOnInit() {
    this.isAdmin = this.auth.getRole() === 'ADMIN';

    this.form = this.fb.group({
      clientName: ['', Validators.required],
      sector: ['', Validators.required],
      dealType: ['', Validators.required],
      summary: [''],
      dealValue: [null]
    });

    if (!this.isAdmin) {
      this.form.removeControl('dealValue');
    }

    this.dealId = this.route.snapshot.paramMap.get('id') || undefined;
    this.isEdit = !!this.dealId;

    if (this.isEdit && this.dealId) {
      this.deals.getDeal(this.dealId).subscribe(d => {
        this.form.patchValue(d);
      });
    }
  }

  submit() {
    if (this.form.invalid) return;

    const payload = this.form.value;

    if (this.isEdit && this.dealId) {
      this.deals.updateBasic(this.dealId, payload).subscribe(() => {
        this.router.navigate(['/deals']);
      });
    } else {
      this.deals.createDeal(payload).subscribe(() => {
        this.router.navigate(['/deals']);
      });
    }
  }
}
