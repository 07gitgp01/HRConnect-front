import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MesVolontairesComponent } from './mes-volontaires.component';

describe('MesVolontairesComponent', () => {
  let component: MesVolontairesComponent;
  let fixture: ComponentFixture<MesVolontairesComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [MesVolontairesComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(MesVolontairesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
