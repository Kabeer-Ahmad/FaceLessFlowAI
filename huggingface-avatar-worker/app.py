from fastapi import FastAPI, HTTPException, BackgroundTasks
from pydantic import BaseModel
import os
import requests
import subprocess
import json
import uuid
import shutil
from pathlib import Path
from supabase import create_client, Client
from openai import OpenAI
import time
from typing import Dict, Optional

app = FastAPI()

# Global state for background jobs
# In a production environment, this should be a DB or Redis, but for HF Space singleton, a dict works
jobs: Dict[str, dict] = {}

class ProcessRequest(BaseModel):
    videoUrl: str
    projectId: str
    supabaseUrl: str
    supabaseKey: str
    openaiKey: str

class JobStatus(BaseModel):
    job_id: str
    status: str
    progress: int
    message: str
    result: Optional[dict] = None
    error: Optional[str] = None

@app.get("/")
def read_root():
    return {"status": "Avatar Worker is Online", "active_jobs": len(jobs)}

@app.get("/status/{job_id}", response_model=JobStatus)
async def get_status(job_id: str):
    if job_id not in jobs:
        raise HTTPException(status_code=404, detail="Job not found")
    return jobs[job_id]

import traceback

def background_process(job_id: str, req: ProcessRequest):
    temp_dir = Path(f"/tmp/{uuid.uuid4()}")
    temp_dir.mkdir(parents=True, exist_ok=True)
    
    try:
        # 1. Download Video
        print(f"[{job_id}] Step 1: Downloading video from {req.videoUrl}")
        jobs[job_id].update({"status": "processing", "progress": 5, "message": "Downloading video..."})
        video_path = temp_dir / "input_video.mp4"
        try:
            resp = requests.get(req.videoUrl, stream=True, timeout=300)
            resp.raise_for_status()
            with open(video_path, 'wb') as f:
                for chunk in resp.iter_content(chunk_size=8192):
                    f.write(chunk)
            print(f"[{job_id}] Download complete. Size: {video_path.stat().st_size} bytes")
        except Exception as e:
            raise Exception(f"Download Error: {str(e)}")

        # 2. Extract Audio for STT
        print(f"[{job_id}] Step 2: Extracting audio...")
        jobs[job_id].update({"progress": 15, "message": "Extracting audio for AI analysis..."})
        audio_path = temp_dir / "audio.mp3"
        try:
            subprocess.run([
                "ffmpeg", "-i", str(video_path), 
                "-vn", "-acodec", "libmp3lame", "-ar", "16000", "-ac", "1", "-y",
                str(audio_path)
            ], check=True, capture_output=True)
            audio_size = audio_path.stat().st_size
            print(f"[{job_id}] Audio extraction complete. Size: {audio_size} bytes")
            if audio_size > 25 * 1024 * 1024:
                print(f"[{job_id}] WARNING: Audio exceeds 25MB (Whisper limit).")
        except subprocess.CalledProcessError as e:
            raise Exception(f"FFmpeg Audio Error: {e.stderr.decode() if e.stderr else str(e)}")

        # 3. Initialize Clients
        print(f"[{job_id}] Step 3: Initializing API clients...")
        jobs[job_id].update({"progress": 25, "message": "Preparing AI engines..."})
        try:
            supabase: Client = create_client(req.supabaseUrl, req.supabaseKey)
            openai_client = OpenAI(api_key=req.openaiKey)
        except Exception as e:
            raise Exception(f"Client Init Error: {str(e)}")

        # 4. Get Timestamps from OpenAI Whisper
        print(f"[{job_id}] Step 4: Calling OpenAI Whisper...")
        jobs[job_id].update({"progress": 35, "message": "Analyzing speech and timing..."})
        try:
            with open(audio_path, "rb") as audio_file:
                transcript = openai_client.audio.transcriptions.create(
                    file=audio_file,
                    model="whisper-1",
                    response_format="verbose_json",
                    timestamp_granularities=["segment", "word"]
                )
            segments = transcript.segments
            print(f"[{job_id}] Whisper analysis complete. Found {len(segments)} segments.")
        except Exception as e:
            print(f"[{job_id}] OpenAI/JSON Error: {traceback.format_exc()}")
            raise Exception(f"OpenAI Analysis Error: {str(e)}")

        if not segments:
            raise Exception("No speech detected in video")

        # 5. Slice Video and Upload
        print(f"[{job_id}] Step 5: Starting intelligent slice loop...")
        processed_slices = []
        total_segments = len(segments)
        
        for i, segment in enumerate(segments):
            orig_start = segment.start
            orig_end = segment.end
            
            # Intelligent Midpoint Slicing:
            # We split the silence between segments 50/50, but with safety caps.
            
            # 5.1 Calculate End Padding (Next Segment Gap)
            if i + 1 < total_segments:
                gap_next = segments[i+1].start - orig_end
                # Split gap, ensure at least 0.05s overlap if tight, cap at 0.3s
                end_padding = max(0.05, min(0.3, gap_next / 2))
            else:
                end_padding = 0.5 # Tail for the last segment
                
            # 5.2 Calculate Start Padding (Previous Segment Gap)
            if i > 0:
                gap_prev = orig_start - segments[i-1].end
                # Split gap, ensure at least 0.05s overlap if tight, cap at 0.1s
                start_padding = max(0.05, min(0.1, gap_prev / 2))
            else:
                start_padding = 0.1 # Lead-in for the first segment
            
            start = max(0, orig_start - start_padding)
            end = orig_end + end_padding
            text = segment.text.strip()
            duration = end - start
            
            if duration < 0.2: continue
            
            step_progress = 40 + int((i / total_segments) * 50)
            jobs[job_id].update({"progress": step_progress, "message": f"Slicing segment {i+1}/{total_segments}..."})

            output_filename = f"slice_{i}.mp4"
            output_path = temp_dir / output_filename
            
            try:
                # Precise Slicing with Audio Sync Optimization
                # -ss before -i is fast; -t after -i is precise duration.
                # -af aresample=async=1 ensures audio starts/ends correctly relative to the seek.
                subprocess.run([
                    "ffmpeg", "-ss", str(start), "-i", str(video_path), "-t", str(duration), "-y",
                    "-c:v", "libx264", "-preset", "ultrafast", "-crf", "28",
                    "-c:a", "aac", "-b:a", "128k", "-af", "aresample=async=1", 
                    "-map_metadata", "-1", "-avoid_negative_ts", "make_zero",
                    str(output_path)
                ], check=True, capture_output=True)
            except subprocess.CalledProcessError as e:
                print(f"[{job_id}] Slicing Error at index {i}: {e.stderr.decode() if e.stderr else str(e)}")
                continue

            # Upload to Supabase
            try:
                storage_path = f"{req.projectId}/avatar_{int(time.time())}_{i}.mp4"
                with open(output_path, "rb") as f:
                    supabase.storage.from_("projects").upload(
                        path=storage_path,
                        file=f,
                        file_options={"content-type": "video/mp4", "x-upsert": "true"}
                    )
                
                public_url = supabase.storage.from_("projects").get_public_url(storage_path)
                processed_slices.append({"text": text, "url": public_url, "duration": duration})
            except Exception as e:
                print(f"[{job_id}] Upload Error at index {i}: {str(e)}")
                # We can continue if one upload fails, or fail the whole job
                # Let's continue for now to be resilient
                continue

        print(f"[{job_id}] Loop complete. Slices: {len(processed_slices)}")
        jobs[job_id].update({
            "status": "completed", 
            "progress": 100, 
            "message": "Processing complete!", 
            "result": {"slices": processed_slices}
        })

    except Exception as e:
        full_err = traceback.format_exc()
        print(f"[{job_id}] FATAL JOB ERROR: {full_err}")
        jobs[job_id].update({"status": "failed", "error": str(e)})
    finally:
        shutil.rmtree(temp_dir, ignore_errors=True)

@app.post("/process")
async def process_video(req: ProcessRequest, background_tasks: BackgroundTasks):
    job_id = str(uuid.uuid4())
    jobs[job_id] = {
        "job_id": job_id,
        "status": "queued",
        "progress": 0,
        "message": "Job received and queued",
        "result": None,
        "error": None
    }
    
    background_tasks.add_task(background_process, job_id, req)
    
    return {"job_id": job_id}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=7860)
