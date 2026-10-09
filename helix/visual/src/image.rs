//! PNG files in and out, as RGBA with eight bits a channel.
//!
//! **Every picture is decoded to one layout**, whatever color type the file
//! was written in, because the diff reads four bytes a pixel and nothing else.
//! A grayscale pixel becomes three equal channels and an opaque alpha, a
//! palette is expanded, and sixteen bits a channel is cut to eight. That is
//! what `pngjs` hands `pixelmatch` in the scripts this replaces, so a
//! comparison reads the same pixels here that it read there.

use std::io::Cursor;

/// A decoded picture: `rgba` holds `width * height` pixels of four bytes, row
/// by row from the top left.
#[derive(Clone, Debug, PartialEq, Eq)]
pub struct Image {
    pub height: u32,
    pub rgba: Vec<u8>,
    pub width: u32,
}

/// Decodes a PNG file's bytes into RGBA.
///
/// # Errors
///
/// The reason the bytes are not a PNG this can read, lowercase so it continues
/// a sentence.
pub fn decode(bytes: &[u8]) -> Result<Image, String> {
    let mut decoder = png::Decoder::new(Cursor::new(bytes));
    decoder.set_transformations(png::Transformations::normalize_to_color8());
    let mut reader = decoder.read_info().map_err(|error| error.to_string())?;
    let size = reader
        .output_buffer_size()
        .ok_or_else(|| "the picture is too large to decode".to_string())?;
    let mut buffer = vec![0; size];
    let frame = reader
        .next_frame(&mut buffer)
        .map_err(|error| error.to_string())?;
    buffer.truncate(frame.buffer_size());
    let rgba = match frame.color_type {
        png::ColorType::Rgba => buffer,
        png::ColorType::Rgb => buffer
            .chunks_exact(3)
            .flat_map(|pixel| [pixel[0], pixel[1], pixel[2], 255])
            .collect(),
        png::ColorType::GrayscaleAlpha => buffer
            .chunks_exact(2)
            .flat_map(|pixel| [pixel[0], pixel[0], pixel[0], pixel[1]])
            .collect(),
        png::ColorType::Grayscale => buffer
            .iter()
            .flat_map(|&gray| [gray, gray, gray, 255])
            .collect(),
        /* `normalize_to_color8` expands a palette, so an indexed frame never
        reaches here. Refused rather than assumed, so a decoder change shows
        up as an error and never as a picture read four bytes at a time out
        of a buffer of indices. */
        png::ColorType::Indexed => return Err("the palette was not expanded".to_string()),
    };
    Ok(Image {
        height: frame.height,
        rgba,
        width: frame.width,
    })
}

/// Encodes RGBA as a PNG file.
///
/// **Fast compression, because the only pictures this writes are diff
/// images**, which are gitignored and read once. A baseline is written as the
/// browser encoded it and never passes through here, so its bytes stay the
/// ones the capture produced.
///
/// # Errors
///
/// The reason the encoder refused, lowercase.
pub fn encode(image: &Image) -> Result<Vec<u8>, String> {
    let mut out = Vec::new();
    let mut encoder = png::Encoder::new(&mut out, image.width, image.height);
    encoder.set_color(png::ColorType::Rgba);
    encoder.set_depth(png::BitDepth::Eight);
    encoder.set_compression(png::Compression::Fast);
    let mut writer = encoder.write_header().map_err(|error| error.to_string())?;
    writer
        .write_image_data(&image.rgba)
        .map_err(|error| error.to_string())?;
    writer.finish().map_err(|error| error.to_string())?;
    Ok(out)
}

#[cfg(test)]
mod tests {
    use super::*;

    fn written(color: png::ColorType, width: u32, height: u32, data: &[u8]) -> Vec<u8> {
        let mut out = Vec::new();
        let mut encoder = png::Encoder::new(&mut out, width, height);
        encoder.set_color(color);
        encoder.set_depth(png::BitDepth::Eight);
        let mut writer = encoder.write_header().unwrap();
        writer.write_image_data(data).unwrap();
        writer.finish().unwrap();
        out
    }

    #[test]
    fn rgba_survives_a_round_trip() {
        let image = Image {
            height: 2,
            rgba: vec![
                255, 0, 0, 255, 0, 255, 0, 128, //
                0, 0, 255, 0, 10, 20, 30, 40,
            ],
            width: 2,
        };
        assert_eq!(decode(&encode(&image).unwrap()).unwrap(), image);
    }

    #[test]
    fn rgb_gains_an_opaque_alpha() {
        let decoded = decode(&written(png::ColorType::Rgb, 1, 1, &[1, 2, 3])).unwrap();
        assert_eq!(decoded.rgba, vec![1, 2, 3, 255]);
    }

    #[test]
    fn grayscale_fills_all_three_channels() {
        let decoded = decode(&written(png::ColorType::Grayscale, 2, 1, &[7, 9])).unwrap();
        assert_eq!(decoded.rgba, vec![7, 7, 7, 255, 9, 9, 9, 255]);
        let decoded = decode(&written(png::ColorType::GrayscaleAlpha, 1, 1, &[7, 100])).unwrap();
        assert_eq!(decoded.rgba, vec![7, 7, 7, 100]);
    }

    #[test]
    fn bytes_that_are_not_a_png_are_refused() {
        assert!(decode(b"not a picture").is_err());
    }
}
