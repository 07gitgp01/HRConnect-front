// src/app/features/admin/posts/post-form.component.ts
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar } from '@angular/material/snack-bar';
import { EditorModule } from '@tinymce/tinymce-angular';
import tinymce from 'tinymce';

// ✅ chemin corrigé
import { environment } from '../../../environment/environment';
import { PostService } from '../../../services/service_posts/post.service.ts.service';

@Component({
  selector: 'app-post-form',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    EditorModule
  ],
  templateUrl: './post-form.component.html',
  styleUrls: ['./post-form.component.scss']
})
export class PostFormComponent implements OnInit {
  postForm: FormGroup;
  isEditMode = false;
  postId: string | null = null;
  imagePreviewUrl: string | null = null;
  videoPreviewUrl: string | null = null;
  uploadingImage = false;
  uploadingVideo = false;
  private backendBaseUrl = environment.apiUrl.replace('/api', ''); // ✅ http://localhost:8080

  constructor(
    private fb: FormBuilder,
    private postService: PostService,
    private route: ActivatedRoute,
    private router: Router,
    private snackBar: MatSnackBar
  ) {
    tinymce.baseURL = '/assets/tinymce';
    this.postForm = this.fb.group({
      title: ['', Validators.required],
      content: ['', Validators.required],
      imageUrl: [''],
      videoUrl: ['']
    });
  }

  editorConfig = {
    height: 500,
    menubar: true,
    plugins: 'advlist autolink lists link image charmap preview anchor searchreplace visualblocks code fullscreen insertdatetime media table help wordcount',
    toolbar: 'undo redo | formatselect | bold italic backcolor | alignleft aligncenter alignright alignjustify | bullist numlist outdent indent | removeformat | help',
    skin_url: '/assets/tinymce/skins/ui/oxide',
    content_css: '/assets/tinymce/skins/content/default/content.css',
    automatic_uploads: false
  };

  ngOnInit(): void {
    this.postId = this.route.snapshot.paramMap.get('id');
    if (this.postId) {
      this.isEditMode = true;
      this.postService.getById(this.postId).subscribe({
        next: (post) => {
          this.postForm.patchValue(post);
          // ✅ construire l'URL absolue pour l'aperçu
          this.imagePreviewUrl = post.imageUrl ? this.getFullUrl(post.imageUrl) : null;
          this.videoPreviewUrl = post.videoUrl ? this.getFullUrl(post.videoUrl) : null;
        },
        error: () => this.snackBar.open('Erreur chargement article', 'Fermer', { duration: 3000 })
      });
    }
  }

  // ✅ convertit une URL relative en URL absolue vers le backend
  private getFullUrl(relativePath: string): string {
    if (!relativePath) return '';
    if (relativePath.startsWith('http')) return relativePath;
    // nettoie les doubles slashes
    const cleanPath = relativePath.startsWith('/') ? relativePath : '/' + relativePath;
    return this.backendBaseUrl + cleanPath;
  }

  onImageSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length) {
      const file = input.files[0];
      this.uploadingImage = true;
      this.postService.uploadImage(file).subscribe({
        next: (res) => {
          if (res.success) {
            // res.url est relatif (ex: "/uploads/posts/xxx.jpg")
            this.postForm.patchValue({ imageUrl: res.url });
            // ✅ pour l'aperçu, on utilise l'URL absolue
            this.imagePreviewUrl = this.getFullUrl(res.url);
            this.snackBar.open('Image uploadée', 'Fermer', { duration: 2000 });
          }
          this.uploadingImage = false;
        },
        error: () => {
          this.uploadingImage = false;
          this.snackBar.open('Erreur upload image', 'Fermer', { duration: 3000 });
        }
      });
    }
  }

  onVideoSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length) {
      const file = input.files[0];
      this.uploadingVideo = true;
      this.postService.uploadVideo(file).subscribe({
        next: (res) => {
          if (res.success) {
            this.postForm.patchValue({ videoUrl: res.url });
            // ✅ pour l'aperçu, on utilise l'URL absolue
            this.videoPreviewUrl = this.getFullUrl(res.url);
            this.snackBar.open('Vidéo uploadée', 'Fermer', { duration: 2000 });
          }
          this.uploadingVideo = false;
        },
        error: () => {
          this.uploadingVideo = false;
          this.snackBar.open('Erreur upload vidéo', 'Fermer', { duration: 3000 });
        }
      });
    }
  }

  removeImage(): void {
    this.postForm.patchValue({ imageUrl: '' });
    this.imagePreviewUrl = null;
  }

  removeVideo(): void {
    this.postForm.patchValue({ videoUrl: '' });
    this.videoPreviewUrl = null;
  }

  savePost(): void {
  if (this.postForm.invalid) return;
  const post = this.postForm.value;
  if (this.isEditMode && this.postId) {
    this.postService.update(this.postId, post).subscribe({
      next: () => {
        this.snackBar.open('Article modifié', 'Fermer', { duration: 3000 });
        this.router.navigate(['/features/admin/posts']);
      },
      error: () => this.snackBar.open('Erreur modification', 'Fermer', { duration: 3000 })
    });
  } else {
    this.postService.create(post).subscribe({
      next: () => {
        this.snackBar.open('Article publié', 'Fermer', { duration: 3000 });
        this.router.navigate(['/features/admin/posts']);
      },
      error: () => this.snackBar.open('Erreur publication', 'Fermer', { duration: 3000 })
    });
  }
}

annuler(): void {
  this.router.navigate(['/features/admin/posts']);
  // ou selon votre configuration : this.router.navigate(['../posts'], { relativeTo: this.route });
}

}