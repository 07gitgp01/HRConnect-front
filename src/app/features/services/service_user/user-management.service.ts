// src/app/core/services/user-management.service.ts
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { User } from '../../models/user.model';

export interface UserStats {
  total: number;
  profilsComplets: number;
  profilsIncomplets: number;
  recentInscriptions: number;
}

@Injectable({
  providedIn: 'root'
})
export class UserManagementService {
  private apiUrl = 'http://localhost:3000/users';

  constructor(private http: HttpClient) {}

  getUsers(): Observable<User[]> {
    return this.http.get<User[]>(this.apiUrl);
  }

  getUserStats(): Observable<UserStats> {
    return this.getUsers().pipe(
      map(users => {
        const now = new Date();
        const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

        const total = users.length;
        const profilsComplets = users.filter(user => user.profilComplete).length;
        const profilsIncomplets = total - profilsComplets;
        const recentInscriptions = users.filter(user => {
          if (!user.date_inscription) return false;
          try {
            const inscriptionDate = new Date(user.date_inscription);
            return inscriptionDate >= sevenDaysAgo;
          } catch {
            return false;
          }
        }).length;

        return {
          total,
          profilsComplets,
          profilsIncomplets,
          recentInscriptions
        };
      })
    );
  }

  deleteUser(userId: number | string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${userId}`);
  }

  resetPassword(userId: number | string, newPassword: string): Observable<User> {
    return this.http.patch<User>(`${this.apiUrl}/${userId}`, { 
      password: newPassword 
    });
  }

  toggleProfilStatus(userId: number | string, profilComplete: boolean): Observable<User> {
    return this.http.patch<User>(`${this.apiUrl}/${userId}`, { 
      profilComplete 
    });
  }
}