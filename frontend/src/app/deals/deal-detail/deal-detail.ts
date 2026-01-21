import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatSelectModule } from '@angular/material/select';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatDividerModule } from '@angular/material/divider';
import { MatInputModule } from '@angular/material/input';
import { MatMenuModule } from '@angular/material/menu';
import { DealService } from '../../core/services/deal';
import { AuthService } from '../../core/services/auth';
import { Deal, DealStage } from '../../shared/models/deal.model';

@Component({
  standalone: true,
  selector: 'app-deal-detail',
  imports: [
    CommonModule,
    RouterModule,
    FormsModule,
    MatCardModule,
    MatButtonModule,
    MatSelectModule,
    MatIconModule,
    MatChipsModule,
    MatDividerModule,
    MatInputModule,
    MatMenuModule
  ],
  templateUrl: './deal-detail.html',
  styleUrls: ['./deal-detail.scss']
})
export class DealDetail implements OnInit {

  deal?: Deal;
  isAdmin = false;
  newNote = '';
  
  stages: DealStage[] = [
    'Prospect',
    'UnderEvaluation',
    'TermSheetSubmitted',
    'Closed',
    'Lost'
  ];

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private deals: DealService,
    private auth: AuthService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {
    console.log('DealDetail component initialized');
    this.isAdmin = this.auth.getRole() === 'ADMIN';
    const id = this.route.snapshot.paramMap.get('id')!;
    this.load(id);
  }

  load(id: string) {
    this.deals.getDeal(id).subscribe({
      next: (d) => {
        console.log('Deal loaded:', d);
        this.deal = d;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Error loading deal:', err);
        this.cdr.detectChanges();
      }
    });
  }

  updateStage(stage: DealStage) {
    if (!this.deal) return;
    this.deals.updateStage(this.deal.id, stage).subscribe({
      next: (d) => {
        this.deal = d;
        this.cdr.detectChanges();
      },
      error: (err) => console.error('Error updating stage:', err)
    });
  }

  addNote() {
    if (!this.deal || !this.newNote.trim()) return;

    this.deals.addNote(this.deal.id, this.newNote).subscribe({
      next: (d) => {
        this.deal = d;
        this.newNote = '';
        this.cdr.detectChanges();
      },
      error: (err) => console.error('Error adding note:', err)
    });
  }

  edit() {
    if (!this.deal) return;
    this.router.navigate(['/deals', this.deal.id, 'edit']);
  }

  goBack() {
    this.router.navigate(['/deals']);
  }

  getStageLabel(stage: DealStage): string {
    const labels: Record<DealStage, string> = {
      'Prospect': 'Prospect',
      'UnderEvaluation': 'Under Evaluation',
      'TermSheetSubmitted': 'Term Sheet Submitted',
      'Closed': 'Closed',
      'Lost': 'Lost'
    };
    return labels[stage];
  }

  formatCurrency(value: number | undefined): string {
    if (!value) return 'N/A';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      notation: 'compact',
      maximumFractionDigits: 1
    }).format(value);
  }

  formatDate(date: string | undefined): string {
    if (!date) return 'N/A';
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  }
}
