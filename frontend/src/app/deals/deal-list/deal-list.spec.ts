import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DealList } from './deal-list';
import { DealService } from '../../core/services/deal';
import { AuthService } from '../../core/services/auth';
import { of } from 'rxjs';
import { RouterTestingModule } from '@angular/router/testing';

describe('DealList', () => {
  let component: DealList;
  let fixture: ComponentFixture<DealList>;
  let dealMock: any;
  let authMock: any;

  beforeEach(async () => {
    dealMock = {
      getAllDeals: vi.fn(),
      deleteDeal: vi.fn()
    };

    authMock = {
      getRole: vi.fn()
    };

    await TestBed.configureTestingModule({
      imports: [DealList, RouterTestingModule],
      providers: [
        { provide: DealService, useValue: dealMock },
        { provide: AuthService, useValue: authMock }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(DealList);
    component = fixture.componentInstance;
  });

  it('should initialize as USER and load deals', () => {
    authMock.getRole.mockReturnValue('USER');
    const mockDeals = [{ id: '1', clientName: 'A' }];

    dealMock.getAllDeals.mockReturnValue(of(mockDeals));

    component.ngOnInit();

    expect(component.isAdmin).toBe(false);
    expect(component.columns).toEqual([
      'client',
      'sector',
      'type',
      'stage'
    ]);
    expect(dealMock.getAllDeals).toHaveBeenCalled();
    expect(component.deals).toEqual(mockDeals);
  });

  it('should initialize as ADMIN and include admin columns', () => {
    authMock.getRole.mockReturnValue('ADMIN');
    dealMock.getAllDeals.mockReturnValue(of([]));

    component.ngOnInit();

    expect(component.isAdmin).toBe(true);
    expect(component.columns).toEqual([
      'client',
      'sector',
      'type',
      'value',
      'stage',
      'actions'
    ]);
  });

  it('should delete deal and reload', () => {
    authMock.getRole.mockReturnValue('ADMIN');
    dealMock.getAllDeals.mockReturnValue(of([]));
    dealMock.deleteDeal.mockReturnValue(of({}));

    component.ngOnInit();

    vi.spyOn(window, 'confirm').mockReturnValue(true);

    const mockEvent = new Event('click');
    component.deleteDeal('1', mockEvent);

    expect(dealMock.deleteDeal).toHaveBeenCalledWith('1');
    expect(dealMock.getAllDeals).toHaveBeenCalledTimes(2); // init + reload
  });

  it('should not delete when confirm is false', () => {
    vi.spyOn(window, 'confirm').mockReturnValue(false);

    const mockEvent = new Event('click');
    component.deleteDeal('1', mockEvent);

    expect(dealMock.deleteDeal).not.toHaveBeenCalled();
  });
});
