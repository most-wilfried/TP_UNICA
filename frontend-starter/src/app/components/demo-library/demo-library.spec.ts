import { TestBed } from '@angular/core/testing';
import { describe, expect, it, vi } from 'vitest';
import { DemoLibraryComponent } from './demo-library';

describe('Bundled musical styles', () => {
  it('filters the real catalog and emits the correct track and target deck', async () => {
    await TestBed.configureTestingModule({ imports: [DemoLibraryComponent] }).compileComponents();
    const fixture = TestBed.createComponent(DemoLibraryComponent);
    fixture.componentRef.setInput('mixing', true);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelectorAll('.demo-track').length).toBe(60);
    const component = fixture.componentInstance;
    const emit = vi.spyOn(component.chooseDeck, 'emit');
    component.selectedStyle.set('House'); fixture.detectChanges();
    expect(fixture.nativeElement.querySelectorAll('.demo-track').length).toBe(10);
    const button: HTMLButtonElement = fixture.nativeElement.querySelector('.demo-track:first-child .demo-actions button:last-child');
    button.click();
    expect(emit).toHaveBeenCalledWith({ track: component.demos.find('demo-house'), deck: 'B' });
    fixture.componentRef.setInput('busyB', true); fixture.detectChanges();
    expect(button.disabled).toBe(true);
    fixture.destroy();
  });
});
