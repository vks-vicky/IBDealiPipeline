import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatSelectModule } from '@angular/material/select';
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
    MatSelectModule
  ],
  templateUrl: './deal-detail.html'
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
    private auth: AuthService
  ) {}

  ngOnInit() {
    this.isAdmin = this.auth.getRole() === 'ADMIN';
    const id = this.route.snapshot.paramMap.get('id')!;
    this.load(id);
  }

  load(id: string) {
    this.deals.getDeal(id).subscribe(d => this.deal = d);
  }

  updateStage(stage: DealStage) {
    if (!this.deal) return;
    this.deals.updateStage(this.deal.id, stage).subscribe(d => {
      this.deal = d;
    });
  }

  addNote() {
    if (!this.deal || !this.newNote.trim()) return;

    this.deals.addNote(this.deal.id, this.newNote).subscribe(d => {
      this.deal = d;
      this.newNote = '';
    });
  }

  edit() {
    this.router.navigate(['/deals', this.deal!.id, 'edit']);
  }
}
