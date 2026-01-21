import { Component, OnInit, ChangeDetectorRef, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatChipsModule } from '@angular/material/chips';
import { MatMenuModule } from '@angular/material/menu';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatCardModule } from '@angular/material/card';
import { DealService } from '../../core/services/deal';
import { AuthService } from '../../core/services/auth';
import { Deal, DealStage } from '../../shared/models/deal.model';
import { DealForm } from '../deal-form/deal-form';

@Component({
  standalone: true,
  selector: 'app-deal-list',
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    MatTableModule,
    MatButtonModule,
    MatIconModule,
    MatInputModule,
    MatSelectModule,
    MatChipsModule,
    MatMenuModule,
    MatDialogModule,
    MatTooltipModule,
    MatCardModule
  ],
  templateUrl: './deal-list.html',
  styleUrls: ['./deal-list.scss']
})
export class DealList implements OnInit, AfterViewInit {

  deals: Deal[] = [];
  filteredDeals: Deal[] = [];
  paginatedDeals: Deal[] = [];
  
  searchTerm = '';
  selectedSector = 'ALL';
  selectedStage = 'ALL';
  selectedType = 'ALL';
  
  isAdmin = false;
  viewMode: 'table' | 'kanban' = 'table';
  
  columns = ['client', 'sector', 'type', 'value', 'stage', 'actions'];
  
  // Pagination
  currentPage = 1;
  pageSize = 10;
  totalDeals = 0;

  // Kanban stages
  stages: DealStage[] = [
    'Prospect',
    'UnderEvaluation',
    'TermSheetSubmitted',
    'Closed',
    'Lost'
  ];

  constructor(
    private dealService: DealService,
    private auth: AuthService,
    private dialog: MatDialog,
    private cdr: ChangeDetectorRef
  ) { }

  ngOnInit() {
    console.log('DealList component initialized');
    this.isAdmin = this.auth.getRole() === 'ADMIN';
    
    if (!this.isAdmin) {
      this.columns = ['client', 'sector', 'type', 'stage'];
    }
    
    this.loadDeals();
  }

  ngAfterViewInit() {
    this.cdr.detectChanges();
  }

  loadDeals() {
    this.dealService.getAllDeals().subscribe({
      next: (data) => {
        console.log('Deals loaded:', data);
        this.deals = data || [];
        this.filterDeals();
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Error loading deals:', err);
        this.deals = [];
        this.filteredDeals = [];
        this.paginatedDeals = [];
        this.totalDeals = 0;
        this.cdr.detectChanges();
      }
    });
  }

  filterDeals() {
    let filtered = [...this.deals];

    // Search filter
    if (this.searchTerm) {
      const term = this.searchTerm.toLowerCase();
      filtered = filtered.filter(deal =>
        deal.clientName?.toLowerCase().includes(term) ||
        deal.sector?.toLowerCase().includes(term) ||
        deal.dealType?.toLowerCase().includes(term) ||
        deal.summary?.toLowerCase().includes(term)
      );
    }

    // Sector filter
    if (this.selectedSector !== 'ALL') {
      filtered = filtered.filter(deal => deal.sector === this.selectedSector);
    }

    // Stage filter
    if (this.selectedStage !== 'ALL') {
      filtered = filtered.filter(deal => deal.currentStage === this.selectedStage);
    }

    // Type filter
    if (this.selectedType !== 'ALL') {
      filtered = filtered.filter(deal => deal.dealType === this.selectedType);
    }

    this.filteredDeals = filtered;
    this.totalDeals = filtered.length;
    this.currentPage = 1;
    this.updatePagination();
    console.log('Filtered deals:', filtered.length, 'Paginated:', this.paginatedDeals.length);
  }

  updatePagination() {
    const startIndex = (this.currentPage - 1) * this.pageSize;
    const endIndex = startIndex + this.pageSize;
    this.paginatedDeals = this.filteredDeals.slice(startIndex, endIndex);
    this.cdr.markForCheck();
  }

  get totalPages(): number {
    return Math.ceil(this.totalDeals / this.pageSize);
  }

  get startIndex(): number {
    return (this.currentPage - 1) * this.pageSize + 1;
  }

  get endIndex(): number {
    return Math.min(this.currentPage * this.pageSize, this.totalDeals);
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
    this.selectedSector = 'ALL';
    this.selectedStage = 'ALL';
    this.selectedType = 'ALL';
    this.filterDeals();
  }

  openCreateDealDialog() {
    const dialogRef = this.dialog.open(DealForm, {
      width: '700px',
      disableClose: true,
      panelClass: 'custom-dialog'
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.loadDeals();
      }
    });
  }

  deleteDeal(id: string, event: Event) {
    event.stopPropagation();
    if (!confirm('Delete this deal?')) return;

    this.dealService.deleteDeal(id).subscribe({
      next: () => this.loadDeals(),
      error: (err) => console.error('Error deleting deal:', err)
    });
  }

  toggleView(mode: 'table' | 'kanban') {
    this.viewMode = mode;
  }

  getDealsByStage(stage: DealStage): Deal[] {
    return this.filteredDeals.filter(deal => deal.currentStage === stage);
  }

  getStageLabel(stage: DealStage): string {
    const labels: Record<DealStage, string> = {
      'Prospect': 'Prospect',
      'UnderEvaluation': 'Under Evaluation',
      'TermSheetSubmitted': 'Term Sheet',
      'Closed': 'Closed',
      'Lost': 'Lost'
    };
    return labels[stage];
  }

  getStageCount(stage: DealStage): number {
    return this.getDealsByStage(stage).length;
  }

  getStageTotalValue(stage: DealStage): number {
    return this.getDealsByStage(stage)
      .reduce((sum, deal) => sum + (deal.dealValue || 0), 0);
  }

  trackByDealId(index: number, deal: Deal): any {
    return deal.id || index;
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
}
