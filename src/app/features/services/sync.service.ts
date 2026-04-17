import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

/**
 * Service léger de bus d'événements.
 * Permet à n'importe quel service ou composant de signaler
 * qu'une entité a changé → tous les abonnés rechargent.
 */
@Injectable({ providedIn: 'root' })
export class SyncService {

  /** Incrémenté à chaque changement de volontaire */
  private _volontaires$ = new BehaviorSubject<number>(0);
  /** Incrémenté à chaque changement de candidature */
  private _candidatures$ = new BehaviorSubject<number>(0);
  /** Incrémenté à chaque changement d'affectation */
  private _affectations$ = new BehaviorSubject<number>(0);
  /** Incrémenté à chaque changement de projet */
  private _projets$ = new BehaviorSubject<number>(0);

  readonly volontaires$ = this._volontaires$.asObservable();
  readonly candidatures$ = this._candidatures$.asObservable();
  readonly affectations$ = this._affectations$.asObservable();
  readonly projets$ = this._projets$.asObservable();

  /** Récupère la valeur actuelle pour forcer une notification si nécessaire */
  getVolontairesVersion(): number { return this._volontaires$.getValue(); }
  getCandidaturesVersion(): number { return this._candidatures$.getValue(); }
  getAffectationsVersion(): number { return this._affectations$.getValue(); }
  getProjetsVersion(): number { return this._projets$.getValue(); }

  notifierVolontaires(): void { 
    this._volontaires$.next(this._volontaires$.getValue() + 1); 
    console.log('🔄 SyncService: volontaires notifiés');
  }
  
  notifierCandidatures(): void { 
    this._candidatures$.next(this._candidatures$.getValue() + 1); 
    console.log('🔄 SyncService: candidatures notifiées');
  }
  
  notifierAffectations(): void { 
    this._affectations$.next(this._affectations$.getValue() + 1); 
    console.log('🔄 SyncService: affectations notifiées');
  }
  
  notifierProjets(): void { 
    this._projets$.next(this._projets$.getValue() + 1); 
    console.log('🔄 SyncService: projets notifiés');
  }

  /** Notifie toutes les entités en une seule fois */
  notifierTout(): void {
    this.notifierVolontaires();
    this.notifierCandidatures();
    this.notifierAffectations();
    this.notifierProjets();
    console.log('🔄 SyncService: toutes les entités notifiées');
  }

  /** Réinitialise tous les compteurs (utile pour les tests) */
  reset(): void {
    this._volontaires$.next(0);
    this._candidatures$.next(0);
    this._affectations$.next(0);
    this._projets$.next(0);
  }
}