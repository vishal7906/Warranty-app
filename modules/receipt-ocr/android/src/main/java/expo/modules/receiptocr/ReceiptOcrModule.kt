package expo.modules.receiptocr

import android.net.Uri
import com.google.mlkit.vision.common.InputImage
import com.google.mlkit.vision.text.Text
import com.google.mlkit.vision.text.TextRecognition
import com.google.mlkit.vision.text.latin.TextRecognizerOptions
import expo.modules.kotlin.Promise
import expo.modules.kotlin.exception.CodedException
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

/**
 * Lines closer together than this (as a fraction of image height) are treated
 * as sitting on the same row when sorting into reading order.
 */
private const val SAME_ROW_TOLERANCE = 0.01

internal class ImageLoadException(uri: String, cause: Throwable?) :
  CodedException("Could not read an image from $uri", cause)

internal class MissingContextException :
  CodedException("The Android context is unavailable.")

class ReceiptOcrModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("ReceiptOcr")

    AsyncFunction("recognizeText") { uri: String, promise: Promise ->
      val context = appContext.reactContext ?: throw MissingContextException()

      val image = try {
        InputImage.fromFilePath(context, Uri.parse(uri))
      } catch (cause: Throwable) {
        throw ImageLoadException(uri, cause)
      }

      // ML Kit is callback-based, so this resolves the promise by hand rather
      // than returning a value from the function body.
      TextRecognition.getClient(TextRecognizerOptions.DEFAULT_OPTIONS)
        .process(image)
        .addOnSuccessListener { result ->
          promise.resolve(toResultMap(result, image.width, image.height))
        }
        .addOnFailureListener { cause ->
          promise.reject(ImageLoadException(uri, cause))
        }
    }
  }

  private fun toResultMap(result: Text, imageWidth: Int, imageHeight: Int): Map<String, Any> {
    val width = imageWidth.toDouble().coerceAtLeast(1.0)
    val height = imageHeight.toDouble().coerceAtLeast(1.0)

    val lines = result.textBlocks
      .flatMap { block -> block.lines }
      .mapNotNull { line ->
        // A line without a box cannot be placed on the page, and every parsing
        // heuristic downstream depends on position.
        val box = line.boundingBox ?: return@mapNotNull null
        mapOf(
          "text" to line.text,
          // ML Kit exposes no per-line confidence, unlike Vision.
          "confidence" to 1.0,
          "x" to box.left / width,
          "y" to box.top / height,
          "width" to box.width() / width,
          "height" to box.height() / height
        )
      }
      .sortedWith(
        // ML Kit returns blocks in layout order, not reading order.
        Comparator { first, second ->
          val firstY = first["y"] as Double
          val secondY = second["y"] as Double
          if (kotlin.math.abs(firstY - secondY) > SAME_ROW_TOLERANCE) {
            firstY.compareTo(secondY)
          } else {
            (first["x"] as Double).compareTo(second["x"] as Double)
          }
        }
      )

    return mapOf(
      "text" to lines.joinToString("\n") { it["text"] as String },
      "lines" to lines,
      "width" to imageWidth,
      "height" to imageHeight
    )
  }
}
