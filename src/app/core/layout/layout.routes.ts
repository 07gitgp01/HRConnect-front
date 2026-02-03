// src/app/core/layout/layout.routes.ts
import { Routes } from '@angular/router';
import { LayoutComponent } from './layout.component';

export const layoutRoutes: Routes = [
  {
    path: '',
    component: LayoutComponent,
    children: [
      { path: '', redirectTo: 'home', pathMatch: 'full' },
      { path: 'home', loadComponent: () => import('./home/home.component').then(m => m.HomeComponent) },
      { path: 'contact', loadComponent: () => import('../../features/contact/contact.component').then(m => m.ContactComponent) },
      { 
        path: 'login', 
        loadComponent: () => import('../../features/auth/login/login.component').then(m => m.LoginComponent)
      },
      { 
        path: 'signup', 
        loadComponent: () => import('../../features/auth/signup/signup.component').then(m => m.SignupComponent)
      },

      { 
        path: 'features', 
        loadChildren: () => import('../../features/features-routing.module').then(m=>m.FeaturesRoutingModule)
      },

      { path: '**', redirectTo: 'home' }
    ]
  }
];