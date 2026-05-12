import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar } from '@angular/material/snack-bar';
import { PostService, Post } from '../../../../features/services/service_posts/post.service.ts.service';

@Component({
  selector: 'app-post-detail',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule
  ],
  templateUrl: './post-detail.component.html',
  styleUrls: ['./post-detail.component.scss']
})
export class PostDetailComponent implements OnInit, OnDestroy {
  post: Post | null = null;
  safeContent: SafeHtml | null = null;
  loading = true;
  error = false;

  constructor(
    private route: ActivatedRoute,
    private postService: PostService,
    private sanitizer: DomSanitizer,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.loadPost(id);
    } else {
      this.error = true;
      this.loading = false;
    }
  }

  ngOnDestroy(): void {
    // Nettoyage si nécessaire
  }

  loadPost(id: string): void {
    this.loading = true;
    this.error = false;
    this.postService.getById(id).subscribe({
      next: (post) => {
        this.post = post;
        // Sanitize le contenu HTML pour éviter les XSS
        this.safeContent = this.sanitizer.sanitize(
          1, // SecurityContext.HTML
          post.content
        );
        this.loading = false;
      },
      error: (err) => {
        console.error('Erreur chargement article', err);
        this.error = true;
        this.loading = false;
        this.snackBar.open('Article introuvable', 'Fermer', { duration: 3000 });
      }
    });
  }
}