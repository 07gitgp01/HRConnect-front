import { Component, ViewChild, OnInit, OnDestroy, HostListener, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, RouterOutlet } from '@angular/router';
import { MatSidenav, MatSidenavModule } from '@angular/material/sidenav';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatListModule } from '@angular/material/list';
import { BreakpointObserver, Breakpoints } from '@angular/cdk/layout';
import { HeaderComponent } from './header/header.component';
import { SidebarComponent } from './sidebar/sidebar.component';
import { FooterComponent } from './footer/footer.component';
import { AuthService } from '../../features/services/service_auth/auth.service';

@Component({
  selector: 'app-layout',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    RouterOutlet,
    MatSidenavModule,
    MatToolbarModule,
    MatButtonModule,
    MatIconModule,
    MatListModule,
    HeaderComponent,
    SidebarComponent,
    FooterComponent
  ],
  templateUrl: './layout.component.html',
  styleUrls: ['./layout.component.scss']
})
export class LayoutComponent implements OnInit, OnDestroy {
  @ViewChild('sidenav') sidenav!: MatSidenav;
  isMobile = false;
  
  private breakpointObserver = inject(BreakpointObserver);

  constructor(public authService: AuthService) {}

  ngOnInit(): void {
    // Détecter mobile/desktop
    this.breakpointObserver.observe([
      Breakpoints.Handset,
      Breakpoints.TabletPortrait,
      '(max-width: 768px)'
    ]).subscribe(result => {
      this.isMobile = result.matches;
      console.log(`📱 Mobile: ${this.isMobile}`);
      
      // Sur desktop, ouvrir le sidenav automatiquement
      if (!this.isMobile && this.sidenav) {
        this.sidenav.mode = 'side';
        this.sidenav.open();
      }
      
      // Sur mobile, passer en mode overlay
      if (this.isMobile && this.sidenav) {
        this.sidenav.mode = 'over';
        this.sidenav.close();
      }
    });
  }

  ngOnDestroy(): void {
    console.log('LayoutComponent destroyed');
  }

  toggleSidebar(): void {
    if (this.sidenav) {
      this.sidenav.toggle();
    }
  }

  closeSidebarOnMobile(): void {
    if (this.isMobile && this.sidenav && this.sidenav.opened) {
      this.sidenav.close();
    }
  }

  @HostListener('window:resize', ['$event'])
  onResize(event: Event): void {
    // Fallback manuel
    this.isMobile = window.innerWidth <= 768;
  }
}