import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class UserService {

  private base = `${environment.apiUrl}`;

  constructor(private http: HttpClient) {}

  getAll() {
    return this.http.get<any[]>(`${this.base}/admin/users`);
  }

  create(payload: any) {
    return this.http.post(`${this.base}/admin/users`, payload);
  }

  updateStatus(id: string, active: boolean) {
    return this.http.put(`${this.base}/admin/users/${id}/status`, { active });
  }
}
