import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar } from '@angular/material/snack-bar';
import { PostService, Post } from '../../../services/service_posts/post.service.ts.service';

@Component({
  selector: 'app-posts-list',
  standalone: true,
  imports: [CommonModule, RouterModule, MatCardModule, MatButtonModule, MatIconModule, MatProgressSpinnerModule],
  templateUrl: './posts-list.component.html',
  styleUrls: ['./posts-list.component.scss']
})
export class PostsListComponent implements OnInit {
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
        this.posts = data;
        this.loading = false;
      },
      error: () => {
        this.loading = false;
        this.snackBar.open('Erreur chargement des articles', 'Fermer', { duration: 3000 });
      }
    });
  }

  deletePost(id: string): void {
    if (confirm('Supprimer définitivement cet article ?')) {
      this.postService.delete(id).subscribe({
        next: () => {
          this.posts = this.posts.filter(p => p.id !== id);
          this.snackBar.open('Article supprimé', 'Fermer', { duration: 3000 });
        },
        error: () => this.snackBar.open('Erreur suppression', 'Fermer', { duration: 3000 })
      });
    }
  }
}