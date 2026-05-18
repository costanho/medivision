import { Pipe, PipeTransform } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';

@Pipe({
  name: 'highlight',
  standalone: true
})
export class HighlightPipe implements PipeTransform {
  constructor(private sanitizer: DomSanitizer) {}

  transform(text: string, query: string): SafeHtml {
    if (!text || !query) {
      return text;
    }

    const chars = ['.', '*', '+', '?', '^', '$', '{', '}', '(', ')', '|', '[', ']', '\\\\'];
    let escaped = query;
    for (const char of chars) {
      const pattern = new RegExp('\\\\' + char, 'g');
      escaped = escaped.replace(pattern, '\\\\' + char);
    }
    
    const regex = new RegExp('(' + escaped + ')', 'gi');
    const highlighted = text.replace(regex, '<mark>$1</mark>');

    return this.sanitizer.bypassSecurityTrustHtml(highlighted);
  }
}
