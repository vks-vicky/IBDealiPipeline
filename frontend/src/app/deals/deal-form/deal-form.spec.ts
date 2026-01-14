import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DealForm } from './deal-form';
import { ActivatedRoute, Router } from '@angular/router';
import { of } from 'rxjs';
import { DealService } from '../../core/services/deal';
import { AuthService } from '../../core/services/auth';
import { FormBuilder } from '@angular/forms';
import { RouterTestingModule } from '@angular/router/testing';

describe('DealForm', () => {
  let component: DealForm;
  let fixture: ComponentFixture<DealForm>;
  let dealMock: any;
  let authMock: any;
  let routerMock: any;

  function setup(routeId: string | null, role: string, deal?: any) {
    dealMock = {
      getDeal: vi.fn(),
      createDeal: vi.fn(),
      updateBasic: vi.fn()
    };

    if (routeId && deal) {
      dealMock.getDeal.mockReturnValue(of(deal));
    }

    authMock = {
      getRole: vi.fn().mockReturnValue(role)
    };

    routerMock = {
      navigate: vi.fn()
    };

    TestBed.configureTestingModule({
      imports: [DealForm, RouterTestingModule],
      providers: [
        FormBuilder,
        { provide: DealService, useValue: dealMock },
        { provide: AuthService, useValue: authMock },
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: {
              paramMap: {
                get: () => routeId
              }
            }
          }
        },
        { provide: Router, useValue: routerMock }
      ]
    });

    fixture = TestBed.createComponent(DealForm);
    component = fixture.componentInstance;
    fixture.detectChanges(); // ngOnInit runs here
  }

  it('should initialize form and remove dealValue for USER', () => {
    setup(null, 'USER');

    expect(component.isAdmin).toBe(false);
    expect(component.form.contains('dealValue')).toBe(false);
    expect(component.isEdit).toBe(false);
  });

  it('should load deal in edit mode', () => {
    const mockDeal = {
      clientName: 'Acme',
      sector: 'Tech',
      dealType: 'M&A',
      summary: 'x'
    };

    setup('1', 'ADMIN', mockDeal);

    expect(component.isEdit).toBe(true);
    expect(dealMock.getDeal).toHaveBeenCalledWith('1');
    expect(component.form.value.clientName).toBe('Acme');
  });

  it('should create deal when not in edit mode', () => {
    setup(null, 'ADMIN');

    component.form.setValue({
      clientName: 'A',
      sector: 'B',
      dealType: 'C',
      summary: '',
      dealValue: 100
    });

    dealMock.createDeal.mockReturnValue(of({}));

    component.submit();

    expect(dealMock.createDeal).toHaveBeenCalled();
    expect(routerMock.navigate).toHaveBeenCalledWith(['/deals']);
  });

  it('should update deal when in edit mode', () => {
    const mockDeal = {
      clientName: 'Old',
      sector: 'Old',
      dealType: 'Old',
      summary: ''
    };

    setup('99', 'ADMIN', mockDeal);

    component.form.setValue({
      clientName: 'A',
      sector: 'B',
      dealType: 'C',
      summary: '',
      dealValue: 200
    });

    dealMock.updateBasic.mockReturnValue(of({}));

    component.submit();

    expect(dealMock.updateBasic).toHaveBeenCalledWith('99', component.form.value);
    expect(routerMock.navigate).toHaveBeenCalledWith(['/deals']);
  });

  it('should not submit when form is invalid', () => {
    setup(null, 'ADMIN');

    component.form.patchValue({
      clientName: '',
      sector: '',
      dealType: ''
    });

    component.submit();

    expect(dealMock.createDeal).not.toHaveBeenCalled();
    expect(dealMock.updateBasic).not.toHaveBeenCalled();
  });
});