import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DealList } from '../deal-list/deal-list';
import { DealService } from '../../core/services/deal';
import { AuthService } from '../../core/services/auth';
import { of } from 'rxjs';
import { RouterTestingModule } from '@angular/router/testing';

describe('DealList', () => {
  let component: DealList;
  let fixture: ComponentFixture<DealList>;
  let dealMock: any;
  let authMock: any;

  const mockDeals = [
    {
      id: '1',
      clientName: 'Acme',
      sector: 'Tech',
      dealType: 'M&A',
      dealValue: 1000,
      currentStage: 'Prospect'
    },
    {
      id: '2',
      clientName: 'Beta',
      sector: 'Finance',
      dealType: 'IPO',
      dealValue: 2000,
      currentStage: 'Closed'
    }
  ];

  beforeEach(async () => {
    dealMock = {
      getAllDeals: vi.fn().mockReturnValue(of(mockDeals)),
      deleteDeal: vi.fn().mockReturnValue(of({}))
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
  });

  it('should render USER view without admin columns', () => {
    authMock.getRole.mockReturnValue('USER');

    fixture = TestBed.createComponent(DealList);
    component = fixture.componentInstance;
    fixture.detectChanges();

    const html = fixture.nativeElement as HTMLElement;

    expect(html.textContent).toContain('Acme');
    expect(html.textContent).toContain('Tech');
    expect(html.textContent).toContain('M&A');
    expect(html.textContent).toContain('Prospect');

    // admin-only content should not appear
    expect(html.textContent).not.toContain('Delete Deal');
    expect(html.textContent).not.toContain('$1.0K');
  });

  it('should render ADMIN columns and actions', () => {
    authMock.getRole.mockReturnValue('ADMIN');

    fixture = TestBed.createComponent(DealList);
    component = fixture.componentInstance;
    fixture.detectChanges();

    const html = fixture.nativeElement as HTMLElement;

    expect(html.textContent).toContain('$1.0K');
    expect(html.textContent).toContain('$2.0K');
    
    // Check for action menu button (more_vert icon)
    const menuButtons = html.querySelectorAll('button mat-icon');
    const hasMoreVertIcon = Array.from(menuButtons).some(btn => 
      btn.textContent?.includes('more_vert')
    );
    expect(hasMoreVertIcon).toBe(true);
  });

  it('should call deleteDeal when admin clicks delete', () => {
    authMock.getRole.mockReturnValue('ADMIN');

    fixture = TestBed.createComponent(DealList);
    component = fixture.componentInstance;
    fixture.detectChanges();

    vi.spyOn(window, 'confirm').mockReturnValue(true);
    const mockEvent = new Event('click');

    component.deleteDeal('1', mockEvent);

    expect(dealMock.deleteDeal).toHaveBeenCalledWith('1');
  });

  it('should have create-deal dialog button', () => {
    authMock.getRole.mockReturnValue('USER');

    fixture = TestBed.createComponent(DealList);
    component = fixture.componentInstance;
    fixture.detectChanges();

    const createBtn = fixture.nativeElement.querySelector('button.create-button');
    expect(createBtn).toBeTruthy();
    expect(createBtn.textContent).toContain('Create New Deal');
  });

  it('should render router link for deal detail', () => {
    authMock.getRole.mockReturnValue('USER');

    fixture = TestBed.createComponent(DealList);
    component = fixture.componentInstance;
    fixture.detectChanges();

    const link = fixture.nativeElement.querySelector('a');
    expect(link.textContent).toContain('Acme');
  });
});
