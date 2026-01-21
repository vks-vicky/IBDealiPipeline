import { Component, OnInit, Inject, Optional } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatCardModule } from '@angular/material/card';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatSelectModule } from '@angular/material/select';
import { MatIconModule } from '@angular/material/icon';
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
    MatSelectModule,
    MatIconModule,
    MatDialogModule
  ],
  templateUrl: './deal-form.html',
  styleUrls: ['./deal-form.scss']
})

export class DealForm implements OnInit {

  isEdit = false;
  isAdmin = false;

  form!: ReturnType<FormBuilder['group']>;

  sectors = ['TECH', 'ENERGY', 'CONSUMER', 'RETAIL', 'BIOTECH'];
  dealTypes = ['M&A', 'IPO', 'DEBT', 'ADVISORY'];

  constructor(
    private fb: FormBuilder,
    private deals: DealService,
    private auth: AuthService,
    @Optional() public dialogRef: MatDialogRef<DealForm>,
    @Optional() @Inject(MAT_DIALOG_DATA) public data: any
  ) {}

  ngOnInit() {
    this.isAdmin = this.auth.getRole() === 'ADMIN';

    this.form = this.fb.group({
      clientName: ['', Validators.required],
      sector: ['', Validators.required],
      dealType: ['', Validators.required],
      summary: ['', Validators.required],
      dealValue: [null]
    });

    if (!this.isAdmin) {
      this.form.removeControl('dealValue');
    }

    if (this.data?.deal) {
      this.isEdit = true;
      this.form.patchValue(this.data.deal);
    }
  }

  submit() {
    if (this.form.invalid) return;

    const payload = this.form.value;

    if (this.isEdit && this.data?.deal?.id) {
      this.deals.updateBasic(this.data.deal.id, payload).subscribe({
        next: () => {
          if (this.dialogRef) {
            this.dialogRef.close(true);
          }
        },
        error: (err) => console.error('Error updating deal:', err)
      });
    } else {
      this.deals.createDeal(payload).subscribe({
        next: () => {
          if (this.dialogRef) {
            this.dialogRef.close(true);
          }
        },
        error: (err) => console.error('Error creating deal:', err)
      });
    }
  }

  cancel() {
    if (this.dialogRef) {
      this.dialogRef.close(false);
    }
  }
}
