import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar } from '@angular/material/snack-bar';
import { PostService, Post } from '../../../../features/services/service_posts/post.service.ts.service';
import { StripHtmlPipe } from '../../../../shared/pipes/strip-html.pipe';

@Component({
  selector: 'app-posts-list-public',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    StripHtmlPipe
  ],
  templateUrl: './posts-list.component.html',
  styleUrls: ['./posts-list.component.scss']
})
export class PostsListPublicComponent implements OnInit {
  posts: Post[] = [];
  loading = true;

  constructor(
    private postService: PostService,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.loadPosts();
  }

  loadPosts(): void {
    this.loading = true;
    this.postService.getAll().subscribe({
      next: (data) => {
        this.posts = data.sort((a, b) =>
          new Date(b.createdAt || '').getTime() - new Date(a.createdAt || '').getTime()
        );
        this.loading = false;
      },
      error: () => {
        this.loading = false;
        this.snackBar.open('Erreur chargement des actualités', 'Fermer', { duration: 3000 });
      }
    });
  }
}