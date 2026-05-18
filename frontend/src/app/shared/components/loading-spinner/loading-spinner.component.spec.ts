/**
 * Loading Spinner Component Tests
 */

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { LoadingSpinnerComponent } from './loading-spinner.component';

describe('LoadingSpinnerComponent', () => {
  let component: LoadingSpinnerComponent;
  let fixture: ComponentFixture<LoadingSpinnerComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LoadingSpinnerComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(LoadingSpinnerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  describe('Component Rendering', () => {
    it('should create', () => {
      expect(component).toBeTruthy();
    });

    it('should render spinner container', () => {
      const container = fixture.nativeElement.querySelector('.spinner-container');
      expect(container).toBeTruthy();
    });

    it('should render spinner', () => {
      const spinner = fixture.nativeElement.querySelector('.spinner');
      expect(spinner).toBeTruthy();
    });
  });

  describe('Size Variants', () => {
    it('should apply default size (md)', () => {
      expect(component.size).toBe('md');
      fixture.detectChanges();
      const spinner = fixture.nativeElement.querySelector('.spinner');
      expect(spinner.classList.contains('spinner-md')).toBe(true);
    });

    it('should apply small size', () => {
      component.size = 'sm';
      fixture.detectChanges();
      const spinner = fixture.nativeElement.querySelector('.spinner');
      expect(spinner.classList.contains('spinner-sm')).toBe(true);
    });

    it('should apply large size', () => {
      component.size = 'lg';
      fixture.detectChanges();
      const spinner = fixture.nativeElement.querySelector('.spinner');
      expect(spinner.classList.contains('spinner-lg')).toBe(true);
    });

    it('should apply extra large size', () => {
      component.size = 'xl';
      fixture.detectChanges();
      const spinner = fixture.nativeElement.querySelector('.spinner');
      expect(spinner.classList.contains('spinner-xl')).toBe(true);
    });
  });

  describe('Color Variants', () => {
    it('should apply default color (primary)', () => {
      expect(component.color).toBe('primary');
      const container = fixture.nativeElement.querySelector('.spinner-container');
      expect(container.classList.contains('color-primary')).toBe(true);
    });

    it('should apply secondary color', () => {
      component.color = 'secondary';
      fixture.detectChanges();
      const container = fixture.nativeElement.querySelector('.spinner-container');
      expect(container.classList.contains('color-secondary')).toBe(true);
    });

    it('should apply success color', () => {
      component.color = 'success';
      fixture.detectChanges();
      const container = fixture.nativeElement.querySelector('.spinner-container');
      expect(container.classList.contains('color-success')).toBe(true);
    });

    it('should apply error color', () => {
      component.color = 'error';
      fixture.detectChanges();
      const container = fixture.nativeElement.querySelector('.spinner-container');
      expect(container.classList.contains('color-error')).toBe(true);
    });

    it('should apply warn color', () => {
      component.color = 'warn';
      fixture.detectChanges();
      const container = fixture.nativeElement.querySelector('.spinner-container');
      expect(container.classList.contains('color-warn')).toBe(true);
    });
  });

  describe('Text Display', () => {
    it('should not display text by default', () => {
      const text = fixture.nativeElement.querySelector('.spinner-text');
      expect(text).toBeFalsy();
    });

    it('should display main text when provided', () => {
      component.text = 'Loading...';
      fixture.detectChanges();
      const text = fixture.nativeElement.querySelector('.spinner-text');
      expect(text).toBeTruthy();
      expect(text.textContent).toBe('Loading...');
    });

    it('should not display subtext by default', () => {
      const subtext = fixture.nativeElement.querySelector('.spinner-subtext');
      expect(subtext).toBeFalsy();
    });

    it('should display subtext when provided', () => {
      component.subtext = 'Please wait...';
      fixture.detectChanges();
      const subtext = fixture.nativeElement.querySelector('.spinner-subtext');
      expect(subtext).toBeTruthy();
      expect(subtext.textContent).toBe('Please wait...');
    });

    it('should display both text and subtext', () => {
      component.text = 'Loading messages...';
      component.subtext = 'This may take a few seconds';
      fixture.detectChanges();

      const text = fixture.nativeElement.querySelector('.spinner-text');
      const subtext = fixture.nativeElement.querySelector('.spinner-subtext');

      expect(text.textContent).toBe('Loading messages...');
      expect(subtext.textContent).toBe('This may take a few seconds');
    });
  });

  describe('Accessibility', () => {
    it('should have aria-busy attribute', () => {
      const container = fixture.nativeElement.querySelector('.spinner-container');
      expect(container.getAttribute('aria-busy')).toBe('true');
    });

    it('should have role status', () => {
      const container = fixture.nativeElement.querySelector('.spinner-container');
      expect(container.getAttribute('role')).toBe('status');
    });

    it('should have aria-live attribute', () => {
      const container = fixture.nativeElement.querySelector('.spinner-container');
      expect(container.getAttribute('aria-live')).toBe('polite');
    });
  });

  describe('Styling Classes', () => {
    it('should apply size class to container', () => {
      component.size = 'lg';
      fixture.detectChanges();
      const container = fixture.nativeElement.querySelector('.spinner-container');
      expect(container.classList.contains('size-lg')).toBe(true);
    });

    it('should apply color class to container', () => {
      component.color = 'success';
      fixture.detectChanges();
      const container = fixture.nativeElement.querySelector('.spinner-container');
      expect(container.classList.contains('color-success')).toBe(true);
    });
  });

  describe('Input Changes', () => {
    it('should update size on input change', () => {
      component.size = 'sm';
      fixture.detectChanges();
      let spinner = fixture.nativeElement.querySelector('.spinner');
      expect(spinner.classList.contains('spinner-sm')).toBe(true);

      component.size = 'xl';
      fixture.detectChanges();
      spinner = fixture.nativeElement.querySelector('.spinner');
      expect(spinner.classList.contains('spinner-xl')).toBe(true);
    });

    it('should update text on input change', () => {
      component.text = 'Loading...';
      fixture.detectChanges();
      let text = fixture.nativeElement.querySelector('.spinner-text');
      expect(text.textContent).toBe('Loading...');

      component.text = 'Please wait...';
      fixture.detectChanges();
      text = fixture.nativeElement.querySelector('.spinner-text');
      expect(text.textContent).toBe('Please wait...');
    });
  });

  describe('Default Values', () => {
    it('should have default size', () => {
      expect(component.size).toBe('md');
    });

    it('should have default color', () => {
      expect(component.color).toBe('primary');
    });

    it('should have empty text by default', () => {
      expect(component.text).toBe('');
    });

    it('should have empty subtext by default', () => {
      expect(component.subtext).toBe('');
    });
  });
});
