import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { DealService } from '../../core/services/deal';
import { AuthService } from '../../core/services/auth';
import { Deal } from '../../shared/models/deal.model';
import { R } from '@angular/cdk/keycodes';
import { RouterModule } from '@angular/router';

@Component({
  standalone: true,
  selector: 'app-deal-list',
  imports: [CommonModule, MatTableModule, MatButtonModule, RouterModule],
  templateUrl: './deal-list.html'
})
export class DealList implements OnInit {

  deals: Deal[] = [];
  isAdmin = false;

  displayedColumns: string[] = ['clientName', 'sector', 'dealType', 'stage'];

  constructor(
    private dealService: DealService,
    private auth: AuthService
  ) { }

  ngOnInit() {
    this.isAdmin = this.auth.getRole() === 'ADMIN';

    if (this.isAdmin) {
      this.displayedColumns = [
        'clientName',
        'sector',
        'dealType',
        'dealValue',
        'stage',
        'actions'
      ];
    }

    this.loadDeals();
  }

  loadDeals() {
    this.dealService.getAllDeals().subscribe({
      next: data => this.deals = data
    });
  }

  deleteDeal(id: string) {
    if (!confirm('Delete this deal?')) return;

    this.dealService.deleteDeal(id).subscribe({
      next: () => this.loadDeals()
    });
  }
}
