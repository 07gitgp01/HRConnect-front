import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'replaceSpace',
  standalone: true
})
export class ReplaceSpacePipe implements PipeTransform {
  transform(value: string | null | undefined): string {
    if (!value) return ''; // ✅ si value est null ou undefined, retourne une chaîne vide
    return value.replace(/\s/g, ''); // Remplace tous les espaces
  }
}
