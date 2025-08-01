// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::fs::File;
use std::io::{Read, Write};
use std::path::{Path, PathBuf};
use tauri::command;
use walkdir::WalkDir;
use zip::write::FileOptions;

// Funzione di utilità per creare uno zip di una directory intera
fn zip_dir<T>(
    src_dir: &Path,
    writer: T,
    method: zip::CompressionMethod,
) -> zip::result::ZipResult<()>
where
    T: Write + std::io::Seek,
{
    let mut zip = zip::ZipWriter::new(writer);
    let options = FileOptions::default()
        .compression_method(method)
        .unix_permissions(0o755);
    let walkdir = WalkDir::new(src_dir);
    let src_dir_str = src_dir.to_str().unwrap();

    for entry in walkdir.into_iter().filter_map(|e| e.ok()) {
        let path = entry.path();
        let name = path.strip_prefix(Path::new(src_dir_str)).unwrap();

        if path.is_file() {
            zip.start_file(name.to_string_lossy(), options)?;
            let mut f = File::open(path)?;
            let mut buffer = Vec::new();
            f.read_to_end(&mut buffer)?;
            zip.write_all(&*buffer)?;
        } else if !name.as_os_str().is_empty() {
            zip.add_directory(name.to_string_lossy(), options)?;
        }
    }

    zip.finish()?;

    Ok(())
}

#[tauri::command]
fn zip_binds() -> bool {
    use std::fs::File;
    use std::path::PathBuf;

    // Ottieni %LOCALAPPDATA%
    let local_appdata = std::env::var("LOCALAPPDATA").unwrap_or_default();
    if local_appdata.is_empty() {
        return false;
    }

    let bindings_dir = PathBuf::from(local_appdata)
        .join("Frontier Developments")
        .join("Elite Dangerous")
        .join("Options")
        .join("Bindings");

    if !bindings_dir.exists() {
        return false;
    }

    // Ottieni il percorso dell'eseguibile e la relativa directory
    let exe_path = match std::env::current_exe() {
        Ok(path) => path,
        Err(_) => return false,
    };
    let exe_dir = match exe_path.parent() {
        Some(parent) => parent,
        None => return false,
    };
    let destination = exe_dir.join("Bindings.zip");

    // Crea lo zip
    match File::create(&destination) {
        Ok(file) => match zip_dir(&bindings_dir, file, zip::CompressionMethod::Deflated) {
            Ok(_) => true,
            Err(_) => false,
        },
        Err(_) => false,
    }
}

fn main() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![zip_binds])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
