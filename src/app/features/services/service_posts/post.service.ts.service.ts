import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '../../../features/environment/environment';

export interface Post {
  id?: string;
  title: string;
  content: string;
  imageUrl?: string;
  videoUrl?: string;
  createdAt?: string;
  updatedAt?: string;
}

@Injectable({ providedIn: 'root' })
export class PostService {
  private apiUrl = `${environment.apiUrl}/posts`;
  private backendBaseUrl = environment.apiUrl.replace('/api', ''); // = 'http://localhost:8080'

  constructor(private http: HttpClient) {}

  // Convertit une URL relative en absolue
  private toAbsoluteUrl(relativePath: string | undefined): string | undefined {
    if (!relativePath) return undefined;
    if (relativePath.startsWith('http')) return relativePath;
    const cleanPath = relativePath.startsWith('/') ? relativePath : '/' + relativePath;
    return this.backendBaseUrl + cleanPath;
  }

  getAll(): Observable<Post[]> {
    return this.http.get<Post[]>(this.apiUrl).pipe(
      map(posts => posts.map(post => ({
        ...post,
        imageUrl: this.toAbsoluteUrl(post.imageUrl),
        videoUrl: this.toAbsoluteUrl(post.videoUrl)
      })))
    );
  }

  getById(id: string): Observable<Post> {
    return this.http.get<Post>(`${this.apiUrl}/${id}`).pipe(
      map(post => ({
        ...post,
        imageUrl: this.toAbsoluteUrl(post.imageUrl),
        videoUrl: this.toAbsoluteUrl(post.videoUrl)
      }))
    );
  }

  create(post: Post): Observable<Post> {
    return this.http.post<Post>(this.apiUrl, post);
  }

  update(id: string, post: Post): Observable<Post> {
    return this.http.put<Post>(`${this.apiUrl}/${id}`, post);
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }

  uploadImage(file: File): Observable<{ success: boolean; url: string; message: string }> {
    const formData = new FormData();
    formData.append('file', file);
    return this.http.post<{ success: boolean; url: string; message: string }>(
      `${environment.apiUrl}/upload-post-image`,
      formData
    );
  }

  uploadVideo(file: File): Observable<{ success: boolean; url: string; message: string }> {
    const formData = new FormData();
    formData.append('file', file);
    return this.http.post<{ success: boolean; url: string; message: string }>(
      `${environment.apiUrl}/upload-post-video`,
      formData
    );
  }
}