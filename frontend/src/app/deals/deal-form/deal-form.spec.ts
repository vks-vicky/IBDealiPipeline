import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DealForm } from './deal-form';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { of } from 'rxjs';

describe('DealForm', () => {
  let component: DealForm;
  let fixture: ComponentFixture<DealForm>;
  let dialogRefMock: any;

  beforeEach(async () => {
    dialogRefMock = { close: vi.fn() };

    await TestBed.configureTestingModule({
      imports: [DealForm, BrowserAnimationsModule],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: MatDialogRef, useValue: dialogRefMock },
        { provide: MAT_DIALOG_DATA, useValue: null }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(DealForm);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize form with empty values for new deal', () => {
    expect(component.form.get('clientName')?.value).toBe('');
    expect(component.form.get('sector')?.value).toBe('');
  });

  it('should close dialog when cancel is clicked', () => {
    component.cancel();
    expect(dialogRefMock.close).toHaveBeenCalledWith(false);
  });

  it('should not submit when form is invalid', () => {
    component.form.patchValue({ clientName: '' }); // invalid
    component.submit();
    expect(dialogRefMock.close).not.toHaveBeenCalled();
  });
});
