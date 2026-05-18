/**
 * Loading Service Tests
 */

import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { LoadingService, LoadingOperation } from './loading.service';
import { take } from 'rxjs/operators';

describe('LoadingService', () => {
  let service: LoadingService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [LoadingService]
    });
    service = TestBed.inject(LoadingService);
  });

  afterEach(() => {
    service.stopAll();
  });

  describe('Start Operation', () => {
    it('should start a loading operation', (done) => {
      service.start('test');

      service.isLoading('test').pipe(take(1)).subscribe(isLoading => {
        expect(isLoading).toBe(true);
        done();
      });
    });

    it('should accept message parameter', (done) => {
      service.start('test', 'Loading messages...');

      service.getMessage('test').pipe(take(1)).subscribe(message => {
        expect(message).toBe('Loading messages...');
        done();
      });
    });

    it('should track start time', () => {
      const before = Date.now();
      service.start('test');
      const after = Date.now();

      const operation = service.getOperation('test');
      operation?.pipe(take(1)).subscribe(op => {
        expect(op?.startTime).toBeGreaterThanOrEqual(before);
        expect(op?.startTime).toBeLessThanOrEqual(after);
      });
    });

    it('should allow multiple concurrent operations', (done) => {
      service.start('op1', 'Loading 1');
      service.start('op2', 'Loading 2');

      service.isLoading('op1').pipe(take(1)).subscribe(isLoading1 => {
        service.isLoading('op2').pipe(take(1)).subscribe(isLoading2 => {
          expect(isLoading1).toBe(true);
          expect(isLoading2).toBe(true);
          done();
        });
      });
    });
  });

  describe('Stop Operation', () => {
    it('should stop a loading operation', (done) => {
      service.start('test');
      service.stop('test');

      service.isLoading('test').pipe(take(1)).subscribe(isLoading => {
        expect(isLoading).toBe(false);
        done();
      });
    });

    it('should not affect other operations', (done) => {
      service.start('op1');
      service.start('op2');
      service.stop('op1');

      service.isLoading('op2').pipe(take(1)).subscribe(isLoading => {
        expect(isLoading).toBe(true);
        done();
      });
    });

    it('should handle stopping non-existent operation', () => {
      expect(() => service.stop('nonexistent')).not.toThrow();
    });
  });

  describe('Stop All Operations', () => {
    it('should stop all operations', (done) => {
      service.start('op1');
      service.start('op2');
      service.stopAll();

      service.isLoading().pipe(take(1)).subscribe(isLoading => {
        expect(isLoading).toBe(false);
        done();
      });
    });
  });

  describe('Global Loading State', () => {
    it('should indicate any operation is loading', (done) => {
      service.start('test');

      service.isLoading().pipe(take(1)).subscribe(isLoading => {
        expect(isLoading).toBe(true);
        done();
      });
    });

    it('should indicate no operations when all stopped', (done) => {
      service.start('test');
      service.stop('test');

      service.isLoading().pipe(take(1)).subscribe(isLoading => {
        expect(isLoading).toBe(false);
        done();
      });
    });
  });

  describe('Progress Tracking', () => {
    it('should set progress', (done) => {
      service.start('test');
      service.setProgress('test', 50);

      service.getProgress('test').pipe(take(1)).subscribe(progress => {
        expect(progress).toBe(50);
        done();
      });
    });

    it('should cap progress at 100', (done) => {
      service.start('test');
      service.setProgress('test', 150);

      service.getProgress('test').pipe(take(1)).subscribe(progress => {
        expect(progress).toBe(100);
        done();
      });
    });

    it('should clamp progress at 0', (done) => {
      service.start('test');
      service.setProgress('test', -50);

      service.getProgress('test').pipe(take(1)).subscribe(progress => {
        expect(progress).toBe(0);
        done();
      });
    });
  });

  describe('Message Updates', () => {
    it('should update message', (done) => {
      service.start('test', 'Initial message');
      service.setMessage('test', 'Updated message');

      service.getMessage('test').pipe(take(1)).subscribe(message => {
        expect(message).toBe('Updated message');
        done();
      });
    });
  });

  describe('Operation Queries', () => {
    it('should check if operation exists', () => {
      service.start('test');
      expect(service.has('test')).toBe(true);
      expect(service.has('nonexistent')).toBe(false);
    });

    it('should get all operations', (done) => {
      service.start('op1');
      service.start('op2');

      service.getAllOperations().pipe(take(1)).subscribe(ops => {
        expect(ops.length).toBe(2);
        done();
      });
    });

    it('should get specific operation', (done) => {
      service.start('test', 'Loading...');

      service.getOperation('test').pipe(take(1)).subscribe(op => {
        expect(op?.key).toBe('test');
        expect(op?.message).toBe('Loading...');
        done();
      });
    });
  });

  describe('Elapsed Time', () => {
    it('should calculate elapsed time', fakeAsync(() => {
      service.start('test');
      tick(100);

      const elapsed = service.getElapsedTime('test');
      expect(elapsed).toBeGreaterThanOrEqual(100);
    }));

    it('should return 0 for non-existent operation', () => {
      const elapsed = service.getElapsedTime('nonexistent');
      expect(elapsed).toBe(0);
    });
  });

  describe('Timeout Handling', () => {
    it('should auto-stop operation after timeout', fakeAsync(() => {
      service.start('test', '', 100);
      tick(150);

      expect(service.has('test')).toBe(false);
    }));

    it('should not timeout if stopped early', fakeAsync(() => {
      service.start('test', '', 100);
      tick(50);
      service.stop('test');
      tick(100);

      expect(service.has('test')).toBe(false);
    }));
  });

  describe('Observable Streams', () => {
    it('should emit on operations change', (done) => {
      let emissionCount = 0;
      service.operations$.subscribe(() => {
        emissionCount++;
        if (emissionCount === 2) { // Initial + start
          expect(emissionCount).toBeGreaterThanOrEqual(2);
          done();
        }
      });

      service.start('test');
    });

    it('should provide reactive isLoading observable', (done) => {
      let states: boolean[] = [];

      service.isLoading('test').subscribe(state => {
        states.push(state);
      });

      service.start('test');
      setTimeout(() => {
        service.stop('test');
        setTimeout(() => {
          expect(states[states.length - 1]).toBe(false);
          done();
        }, 10);
      }, 10);
    });
  });
});
