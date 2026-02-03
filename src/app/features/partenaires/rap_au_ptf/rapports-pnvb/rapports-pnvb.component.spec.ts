import { ComponentFixture, TestBed } from '@angular/core/testing';

import { RapportsPnvbComponent } from './rapports-pnvb.component';

describe('RapportsPnvbComponent', () => {
  let component: RapportsPnvbComponent;
  let fixture: ComponentFixture<RapportsPnvbComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [RapportsPnvbComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(RapportsPnvbComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
