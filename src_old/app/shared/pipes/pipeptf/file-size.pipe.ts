// src/app/shared/pipes/pipeptf/file-size.pipe.ts
import { Pipe, PipeTransform } from '@angular/core';

/**
 * Pipe pour formater la taille des fichiers
 * Convertit les octets en format lisible (Ko, Mo, Go)
 */
@Pipe({
  name: 'fileSize',
  standalone: true
})
export class FileSizePipe implements PipeTransform {
  
  transform(bytes: number | undefined | null): string {
    if (bytes === undefined || bytes === null || bytes === 0) {
      return '0 octet';
    }

    const k = 1024;
    const sizes = ['octets', 'Ko', 'Mo', 'Go', 'To'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    if (i === 0) {
      return `${bytes} ${sizes[i]}`;
    }
    
    const size = (bytes / Math.pow(k, i)).toFixed(2);
    return `${size} ${sizes[i]}`;
  }
}