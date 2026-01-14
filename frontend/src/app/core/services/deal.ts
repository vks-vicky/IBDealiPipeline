import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { environment } from '../../../environments/environment';
import { Deal } from '../../shared/models/deal.model';

@Injectable({ providedIn: 'root' })
export class DealService {

  private baseUrl = `${environment.apiUrl}/deals`;

  constructor(private http: HttpClient) { }

  getAllDeals() {
    return this.http.get<Deal[]>(this.baseUrl);
  }

  getDeal(id: string) {
    return this.http.get<Deal>(`${this.baseUrl}/${id}`);
  }

  createDeal(deal: Partial<Deal>) {
    return this.http.post<Deal>(this.baseUrl, deal);
  }

  updateBasic(id: string, payload: any) {
    return this.http.put<Deal>(`${this.baseUrl}/${id}`, payload);
  }

  updateStage(id: string, stage: string) {
    return this.http.patch<Deal>(`${this.baseUrl}/${id}/stage`, { stage });
  }

  addNote(id: string, note: string) {
    return this.http.post<Deal>(`${this.baseUrl}/${id}/notes`, { note });
  }

  updateValue(id: string, value: number) {
    return this.http.patch<Deal>(`${this.baseUrl}/${id}/value`, { value });
  }

  deleteDeal(id: string) {
    return this.http.delete(`${this.baseUrl}/${id}`);
  }
}
