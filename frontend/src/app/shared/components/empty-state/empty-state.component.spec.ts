/**
 * Empty State Component Tests
 */

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { EmptyStateComponent, EmptyStateAction } from './empty-state.component';

describe('EmptyStateComponent', () => {
  let component: EmptyStateComponent;
  let fixture: ComponentFixture<EmptyStateComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EmptyStateComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(EmptyStateComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  describe('Component Rendering', () => {
    it('should create', () => {
      expect(component).toBeTruthy();
    });

    it('should render container with status role', () => {
      const container = fixture.nativeElement.querySelector('.empty-state-container');
      expect(container).toBeTruthy();
      expect(container.getAttribute('role')).toBe('status');
    });

    it('should render icon', () => {
      const icon = fixture.nativeElement.querySelector('.empty-state-icon');
      expect(icon).toBeTruthy();
    });

    it('should render title', () => {
      const title = fixture.nativeElement.querySelector('.empty-state-title');
      expect(title).toBeTruthy();
    });

    it('should render description', () => {
      const description = fixture.nativeElement.querySelector('.empty-state-description');
      expect(description).toBeTruthy();
    });
  });

  describe('Variant Defaults', () => {
    it('should display conversations variant defaults', () => {
      component.variant = 'conversations';
      fixture.detectChanges();

      const title = fixture.nativeElement.querySelector('.empty-state-title');
      const description = fixture.nativeElement.querySelector('.empty-state-description');

      expect(title.textContent).toContain('No Conversations Yet');
      expect(description.textContent).toContain('doctor');
    });

    it('should display messages variant defaults', () => {
      component.variant = 'messages';
      fixture.detectChanges();

      const title = fixture.nativeElement.querySelector('.empty-state-title');
      expect(title.textContent).toContain('Start a Conversation');
    });

    it('should display search variant defaults', () => {
      component.variant = 'search';
      fixture.detectChanges();

      const title = fixture.nativeElement.querySelector('.empty-state-title');
      expect(title.textContent).toContain('No Results Found');
    });

    it('should display error variant defaults', () => {
      component.variant = 'error';
      fixture.detectChanges();

      const title = fixture.nativeElement.querySelector('.empty-state-title');
      expect(title.textContent).toContain('Something Went Wrong');
    });

    it('should display network variant defaults', () => {
      component.variant = 'network';
      fixture.detectChanges();

      const title = fixture.nativeElement.querySelector('.empty-state-title');
      expect(title.textContent).toContain('No Connection');
    });
  });

  describe('Custom Content', () => {
    it('should use custom title when provided', () => {
      component.title = 'Custom Title';
      fixture.detectChanges();

      const title = fixture.nativeElement.querySelector('.empty-state-title');
      expect(title.textContent).toBe('Custom Title');
    });

    it('should use custom description when provided', () => {
      component.description = 'Custom description text';
      fixture.detectChanges();

      const description = fixture.nativeElement.querySelector('.empty-state-description');
      expect(description.textContent).toBe('Custom description text');
    });

    it('should use custom icon when provided', () => {
      component.icon = '🎉';
      fixture.detectChanges();

      const icon = fixture.nativeElement.querySelector('.empty-state-icon');
      expect(icon.textContent).toContain('🎉');
    });

    it('should use variant icon when custom not provided', () => {
      component.variant = 'conversations';
      fixture.detectChanges();

      const icon = fixture.nativeElement.querySelector('.empty-state-icon');
      expect(icon.textContent).toContain('💬');
    });
  });

  describe('Size Variants', () => {
    it('should apply default size (md)', () => {
      expect(component.size).toBe('md');
      const container = fixture.nativeElement.querySelector('.empty-state-container');
      expect(container.classList.contains('size-md')).toBe(false); // Default, no class needed
    });

    it('should apply small size class', () => {
      component.size = 'sm';
      fixture.detectChanges();

      const container = fixture.nativeElement.querySelector('.empty-state-container');
      expect(container.classList.contains('size-sm')).toBe(true);
    });

    it('should apply large size class', () => {
      component.size = 'lg';
      fixture.detectChanges();

      const container = fixture.nativeElement.querySelector('.empty-state-container');
      expect(container.classList.contains('size-lg')).toBe(true);
    });

    it('should expose isSizeSmall getter', () => {
      component.size = 'sm';
      expect(component.isSizeSmall).toBe(true);

      component.size = 'lg';
      expect(component.isSizeSmall).toBe(false);
    });

    it('should expose isSizeLarge getter', () => {
      component.size = 'lg';
      expect(component.isSizeLarge).toBe(true);

      component.size = 'sm';
      expect(component.isSizeLarge).toBe(false);
    });
  });

  describe('Actions', () => {
    it('should not render actions when none provided', () => {
      component.actions = [];
      fixture.detectChanges();

      const actions = fixture.nativeElement.querySelector('.empty-state-actions');
      expect(actions).toBeFalsy();
    });

    it('should render action buttons when provided', () => {
      component.actions = [
        { label: 'Action 1', action: () => {} },
        { label: 'Action 2', action: () => {} }
      ];
      fixture.detectChanges();

      const buttons = fixture.nativeElement.querySelectorAll('.empty-state-btn');
      expect(buttons.length).toBe(2);
    });

    it('should display action labels', () => {
      component.actions = [
        { label: 'Click Me', action: () => {} }
      ];
      fixture.detectChanges();

      const button = fixture.nativeElement.querySelector('.empty-state-btn');
      expect(button.textContent).toContain('Click Me');
    });

    it('should call action function on click', () => {
      const actionSpy = jasmine.createSpy('action');
      component.actions = [
        { label: 'Test Action', action: actionSpy }
      ];
      fixture.detectChanges();

      const button = fixture.nativeElement.querySelector('.empty-state-btn');
      button.click();

      expect(actionSpy).toHaveBeenCalled();
    });

    it('should emit actionClick on action button click', (done) => {
      component.actions = [
        { label: 'Test', action: () => {} }
      ];
      fixture.detectChanges();

      component.actionClick.subscribe(() => {
        expect(true).toBe(true);
        done();
      });

      const button = fixture.nativeElement.querySelector('.empty-state-btn');
      button.click();
    });

    it('should apply primary button class by default', () => {
      component.actions = [
        { label: 'Primary', action: () => {} }
      ];
      fixture.detectChanges();

      const button = fixture.nativeElement.querySelector('.empty-state-btn');
      expect(button.classList.contains('btn-primary')).toBe(true);
    });

    it('should apply secondary button class when specified', () => {
      component.actions = [
        { label: 'Secondary', action: () => {}, variant: 'secondary' }
      ];
      fixture.detectChanges();

      const button = fixture.nativeElement.querySelector('.empty-state-btn');
      expect(button.classList.contains('btn-secondary')).toBe(true);
    });

    it('should display icon in button when provided', () => {
      component.actions = [
        { label: 'With Icon', action: () => {}, icon: '→' }
      ];
      fixture.detectChanges();

      const icon = fixture.nativeElement.querySelector('.btn-icon');
      expect(icon).toBeTruthy();
      expect(icon.textContent).toContain('→');
    });
  });

  describe('Decorations', () => {
    it('should show decorations by default', () => {
      expect(component.showDecorations).toBe(true);
      fixture.detectChanges();

      const decoration = fixture.nativeElement.querySelector('.empty-state-decoration');
      expect(decoration).toBeTruthy();
    });

    it('should hide decorations when disabled', () => {
      component.showDecorations = false;
      fixture.detectChanges();

      const decoration = fixture.nativeElement.querySelector('.empty-state-decoration');
      expect(decoration).toBeFalsy();
    });
  });

  describe('Accessibility', () => {
    it('should have status role for accessibility', () => {
      const container = fixture.nativeElement.querySelector('.empty-state-container');
      expect(container.getAttribute('role')).toBe('status');
    });

    it('should have aria-label describing empty state', () => {
      component.title = 'Test Empty State';
      fixture.detectChanges();

      const container = fixture.nativeElement.querySelector('.empty-state-container');
      expect(container.getAttribute('aria-label')).toContain('Test Empty State');
    });

    it('should have aria-label on action buttons', () => {
      component.actions = [
        { label: 'Test Action', action: () => {} }
      ];
      fixture.detectChanges();

      const button = fixture.nativeElement.querySelector('.empty-state-btn');
      expect(button.getAttribute('aria-label')).toBe('Test Action');
    });
  });

  describe('Input Changes', () => {
    it('should update title on input change', () => {
      component.title = 'Initial Title';
      fixture.detectChanges();
      let title = fixture.nativeElement.querySelector('.empty-state-title');
      expect(title.textContent).toBe('Initial Title');

      component.title = 'Updated Title';
      fixture.detectChanges();
      title = fixture.nativeElement.querySelector('.empty-state-title');
      expect(title.textContent).toBe('Updated Title');
    });

    it('should update size on input change', () => {
      component.size = 'sm';
      fixture.detectChanges();
      let container = fixture.nativeElement.querySelector('.empty-state-container');
      expect(container.classList.contains('size-sm')).toBe(true);

      component.size = 'lg';
      fixture.detectChanges();
      container = fixture.nativeElement.querySelector('.empty-state-container');
      expect(container.classList.contains('size-sm')).toBe(false);
      expect(container.classList.contains('size-lg')).toBe(true);
    });

    it('should update variant on input change', () => {
      component.variant = 'conversations';
      fixture.detectChanges();
      let title = fixture.nativeElement.querySelector('.empty-state-title');
      expect(title.textContent).toContain('No Conversations Yet');

      component.variant = 'search';
      fixture.detectChanges();
      title = fixture.nativeElement.querySelector('.empty-state-title');
      expect(title.textContent).toContain('No Results Found');
    });
  });

  describe('Default Values', () => {
    it('should have default variant', () => {
      expect(component.variant).toBe('custom');
    });

    it('should have default size', () => {
      expect(component.size).toBe('md');
    });

    it('should have empty title by default', () => {
      expect(component.title).toBe('');
    });

    it('should have empty description by default', () => {
      expect(component.description).toBe('');
    });

    it('should have empty icon by default', () => {
      expect(component.icon).toBe('');
    });

    it('should have no actions by default', () => {
      expect(component.actions.length).toBe(0);
    });

    it('should show decorations by default', () => {
      expect(component.showDecorations).toBe(true);
    });
  });

  describe('Display Getters', () => {
    it('displayTitle should use custom title when provided', () => {
      component.title = 'Custom';
      expect(component.displayTitle).toBe('Custom');
    });

    it('displayTitle should use variant default when not provided', () => {
      component.variant = 'conversations';
      component.title = '';
      expect(component.displayTitle).toContain('No Conversations Yet');
    });

    it('displayDescription should use custom description when provided', () => {
      component.description = 'Custom desc';
      expect(component.displayDescription).toBe('Custom desc');
    });

    it('displayIcon should use custom icon when provided', () => {
      component.icon = '🎉';
      expect(component.displayIcon).toBe('🎉');
    });

    it('displayIcon should use variant default when not provided', () => {
      component.variant = 'conversations';
      component.icon = '';
      expect(component.displayIcon).toBe('💬');
    });
  });
});
