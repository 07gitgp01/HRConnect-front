import { ComponentFixture, TestBed } from '@angular/core/testing';

import { VoirProfilVolontaireComponent } from './voir-profil-volontaire.component';

describe('VoirProfilVolontaireComponent', () => {
  let component: VoirProfilVolontaireComponent;
  let fixture: ComponentFixture<VoirProfilVolontaireComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [VoirProfilVolontaireComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(VoirProfilVolontaireComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
