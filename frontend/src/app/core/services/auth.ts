import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { environment } from '../../../environments/environment';
import { LoginRequest, LoginResponse } from '../../shared/models/auth.model';
import { tap, Observable } from 'rxjs';

export interface User {
  id: string;
  username: string;
  email: string;
  role: string;
  active: boolean;
}

@Injectable({ providedIn: 'root' })
export class AuthService {

  private baseUrl = `${environment.apiUrl}/auth`;
  private apiUrl = environment.apiUrl;

  constructor(private http: HttpClient) { }

  login(req: LoginRequest) {
    return this.http.post<LoginResponse>(`${this.baseUrl}/login`, req)
      .pipe(
        tap(res => {
          localStorage.setItem('accessToken', res.accessToken);
          localStorage.setItem('refreshToken', res.refreshToken);
          localStorage.setItem('role', res.role);
        })
      );
  }

  getCurrentUser(): Observable<User> {
    return this.http.get<User>(`${this.apiUrl}/users/me`);
  }

  logout() {
    localStorage.clear();
  }

  getAccessToken() {
    return localStorage.getItem('accessToken');
  }

  getRole() {
    return localStorage.getItem('role');
  }

  isLoggedIn(): boolean {
    return !!this.getAccessToken();
  }
}
