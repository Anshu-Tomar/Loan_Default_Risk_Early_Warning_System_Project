import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, tap } from 'rxjs';
import { User } from '../models/app.models';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly API = '/api/auth';
  private currentUserSubject = new BehaviorSubject<User | null>(this.getStoredUser());
  currentUser$ = this.currentUserSubject.asObservable();

  constructor(private http: HttpClient) {}

  login(username: string, password: string): Observable<{ token: string; user: User }> {
    return this.http.post<{ token: string; user: User }>(`${this.API}/login`, { username, password })
      .pipe(tap(res => {
        localStorage.setItem('token', res.token);
        localStorage.setItem('user', JSON.stringify(res.user));
        this.currentUserSubject.next(res.user);
      }));
  }

  logout(): void {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    this.currentUserSubject.next(null);
  }

  getToken(): string | null {
    return localStorage.getItem('token');
  }

  isLoggedIn(): boolean {
    return !!this.getToken();
  }

  get currentUser(): User | null {
    return this.currentUserSubject.value;
  }

  hasRole(...roles: string[]): boolean {
    return !!this.currentUser && roles.includes(this.currentUser.role);
  }

  private getStoredUser(): User | null {
    try {
      const u = localStorage.getItem('user');
      return u ? JSON.parse(u) : null;
    } catch { return null; }
  }
}
