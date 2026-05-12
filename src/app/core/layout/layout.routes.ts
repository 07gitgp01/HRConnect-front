// src/app/core/layout/layout.routes.ts
import { Routes } from '@angular/router';
import { LayoutComponent } from './layout.component';
import { RecrutementsComponent } from './recrutements/recrutements.component';
import { DetailProjetComponent } from './detail-projet/detail-projet.component';
import { PostsListPublicComponent } from './posts-pub/posts-list/posts-list.component';
import { PostDetailComponent } from './posts-pub/post-detail/post-detail.component';
import { AboutComponent } from './about/about.component';
import { FaqComponent } from './faq/faq.component';
import { SupportComponent } from './support/support.component';
import { LegalComponent } from './legal/legal.component';
import { PrivacyComponent } from './privacy/privacy.component';

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

        {
          path: 'recrutements',
           component: RecrutementsComponent,
           data: { 
           title: 'Opportunités de Volontariat',
           description: 'Découvrez les projets qui recrutent des volontaires'
         }
        },

            {
                path: 'detail/:id',
                component:DetailProjetComponent
                
              },

              { path: 'actualites', component: PostsListPublicComponent },
  { path: 'actualites/:id', component: PostDetailComponent },

  { path: 'a-propos', component: AboutComponent },
  { path: 'faq', component: FaqComponent },
  { path: 'aide-support', component: SupportComponent },

  { path: 'mentions-legales', component: LegalComponent },
  { path: 'politique-confidentialite', component: PrivacyComponent },

      { path: '**', redirectTo: 'home' }
    ]
  }
];