import { TestBed } from '@angular/core/testing';
import { Subject } from 'rxjs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MusicPlayerService } from './music-player.service';
import { TrackService } from './track.service';
import { CommunityTrack } from '../models/community.model';

describe('Persistent player media changes',()=>{
  let service:MusicPlayerService;
  let audio:HTMLAudioElement;
  let requests:Subject<Blob>[];
  const track=(id:string):CommunityTrack=>({id,title:id,originalName:'test.wav',mimeType:'audio/wav',size:100,createdAt:'2026-10-14',visibility:'public'});
  beforeEach(()=>{
    audio=document.createElement('audio');
    vi.spyOn(audio,'play').mockResolvedValue();vi.spyOn(audio,'pause').mockImplementation(()=>undefined);
    vi.stubGlobal('Audio',function(){return audio;});
    vi.spyOn(URL,'createObjectURL').mockReturnValue('blob:authorized');vi.spyOn(URL,'revokeObjectURL').mockImplementation(()=>undefined);
    vi.spyOn(console,'error').mockImplementation(()=>undefined);
    requests=[];
    TestBed.configureTestingModule({providers:[{provide:TrackService,useValue:{audio:()=>{const request=new Subject<Blob>();requests.push(request);return request;}}}]});
    service=TestBed.inject(MusicPlayerService);
  });
  afterEach(()=>{service.close();TestBed.resetTestingModule();vi.restoreAllMocks();vi.unstubAllGlobals();});
  it('clears the previous playable file when a newly selected file is denied',()=>{
    service.play(track('first'));requests[0].next(new Blob(['audio']));
    expect(audio.play).toHaveBeenCalledTimes(1);
    service.play(track('denied'));requests[1].error({status:404});service.toggle();
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:authorized');
    expect(service.mediaUrl()).toBe('');expect(service.error()).toContain('inaccessible');
    expect(audio.play).toHaveBeenCalledTimes(1);
  });
  it('ignores a late download from an earlier selection and releases the current file on close',()=>{
    service.play(track('old'));service.play(track('current'));
    requests[0].next(new Blob(['late']));expect(URL.createObjectURL).not.toHaveBeenCalled();
    requests[1].next(new Blob(['current']));expect(service.current()?.id).toBe('current');
    service.close();expect(service.current()).toBeNull();expect(service.loading()).toBe(false);
    expect(service.mediaUrl()).toBe('');expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:authorized');
  });
});
