import { Component, OnInit } from '@angular/core';
import { SupabaseService } from '../services/supabase/supabase.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-test-supabase',
  template: `
    <div class="container mt-4">
      <h2>Test Supabase Connection</h2>

      <div class="mb-3">
        <button class="btn btn-primary me-2" (click)="testConnection()">
          Test Connection
        </button>
        <button class="btn btn-success me-2" (click)="testSignUp()">
          Test Sign Up
        </button>
        <button class="btn btn-warning me-2" (click)="testSignIn()">
          Test Sign In
        </button>
        <button class="btn btn-danger" (click)="signOut()">
          Sign Out
        </button>
      </div>

      <div *ngIf="message" class="alert"
           [class.alert-success]="message.type === 'success'"
           [class.alert-danger]="message.type === 'error'"
           [class.alert-info]="message.type === 'info'">
        {{ message.text }}
      </div>

      <div *ngIf="currentUser" class="mt-3">
        <h4>Current User:</h4>
        <pre>{{ currentUser | json }}</pre>
      </div>
    </div>
  `,
  styles: []
})
export class TestSupabaseComponent implements OnInit {
  message: { type: 'success' | 'error' | 'info' | 'warning', text: string } | null = null;
  currentUser: any = null;
  isConnected = false;

  constructor(
    private supabaseService: SupabaseService,
    private router: Router
  ) {}

  ngOnInit() {
    this.supabaseService.authUser.subscribe(user => {
      this.currentUser = user;
      if (user) {
        this.showMessage('success', 'User authenticated: ' + user.email);
      }
    });
  }

  async testConnection() {
    try {
      const { data, error } = await this.supabaseService.select('users', { limit: 1 });
      if (error) {
        this.isConnected = false;
        this.showMessage('error', 'Connection failed: ' + error.message);
      } else {
        this.isConnected = true;
        this.showMessage('success', 'Connection successful! Found ' + data.length + ' users');
      }
    } catch (err: any) {
      this.isConnected = false;
      this.showMessage('error', 'Error: ' + err.message);
    }
  }

  async testSignUp() {
    try {
      const testEmail = 'test' + Date.now() + '@example.com';
      const { user, session, error } = await this.supabaseService.signUp(
        testEmail,
        'password123',
        { prenom: 'Test', nom: 'User' }
      );

      if (error) {
        this.showMessage('error', 'Sign up failed: ' + error.message);
      } else {
        this.showMessage('success', 'Sign up successful! Check email for confirmation.');
      }
    } catch (err: any) {
      this.showMessage('error', 'Error: ' + err.message);
    }
  }

  async testSignIn() {
    try {
      const { user, session, error } = await this.supabaseService.signIn(
        'test@example.com',
        'password123'
      );

      if (error) {
        this.showMessage('error', 'Sign in failed: ' + error.message);
      } else {
        this.showMessage('success', 'Sign in successful!');
      }
    } catch (err: any) {
      this.showMessage('error', 'Error: ' + err.message);
    }
  }

  async signOut() {
    try {
      const { error } = await this.supabaseService.signOut();
      if (error) {
        this.showMessage('error', 'Sign out failed: ' + error.message);
      } else {
        this.showMessage('info', 'Signed out successfully');
      }
    } catch (err: any) {
      this.showMessage('error', 'Error: ' + err.message);
    }
  }

  private showMessage(type: 'success' | 'error' | 'info', text: string) {
    this.message = { type, text };
    setTimeout(() => {
      this.message = null;
    }, 5000);
  }
}
