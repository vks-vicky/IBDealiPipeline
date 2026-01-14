import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { DealService } from './deal';
import { environment } from '../../../environments/environment';

describe('DealService', () => {
  let service: DealService;
  let http: HttpTestingController;
  const base = `${environment.apiUrl}/deals`;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [DealService]
    });

    service = TestBed.inject(DealService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    http.verify();
  });

  it('should fetch all deals', () => {
    const mock = [{ id: '1', clientName: 'Acme' }];

    service.getAllDeals().subscribe(res => {
      expect(res).toEqual(mock);
    });

    const req = http.expectOne(base);
    expect(req.request.method).toBe('GET');
    req.flush(mock);
  });

  it('should fetch a single deal', () => {
    service.getDeal('1').subscribe();

    const req = http.expectOne(`${base}/1`);
    expect(req.request.method).toBe('GET');
    req.flush({ id: '1' });
  });

  it('should create a deal', () => {
    const payload = { clientName: 'New Co' };

    service.createDeal(payload).subscribe();

    const req = http.expectOne(base);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(payload);
    req.flush({});
  });

  it('should update basic fields', () => {
    const payload = { summary: 'x' };

    service.updateBasic('1', payload).subscribe();

    const req = http.expectOne(`${base}/1`);
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual(payload);
    req.flush({});
  });

  it('should update stage', () => {
    service.updateStage('1', 'Closed').subscribe();

    const req = http.expectOne(`${base}/1/stage`);
    expect(req.request.method).toBe('PATCH');
    expect(req.request.body).toEqual({ stage: 'Closed' });
    req.flush({});
  });

  it('should add note', () => {
    service.addNote('1', 'hello').subscribe();

    const req = http.expectOne(`${base}/1/notes`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ note: 'hello' });
    req.flush({});
  });

  it('should update deal value', () => {
    service.updateValue('1', 100).subscribe();

    const req = http.expectOne(`${base}/1/value`);
    expect(req.request.method).toBe('PATCH');
    expect(req.request.body).toEqual({ value: 100 });
    req.flush({});
  });

  it('should delete deal', () => {
    service.deleteDeal('1').subscribe();

    const req = http.expectOne(`${base}/1`);
    expect(req.request.method).toBe('DELETE');
    req.flush({});
  });
});
