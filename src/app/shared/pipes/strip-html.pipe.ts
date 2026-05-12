// src/app/shared/pipes/strip-html.pipe.ts
import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'stripHtml',
  standalone: true
})
export class StripHtmlPipe implements PipeTransform {
  transform(value: string | null | undefined): string {
    if (!value) return '';
    // Supprime toutes les balises HTML
    return value.replace(/<[^>]*>/g, '').trim();
  }
}