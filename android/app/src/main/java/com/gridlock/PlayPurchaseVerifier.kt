package com.gridlock

import android.util.Base64
import com.android.billingclient.api.Purchase
import java.security.KeyFactory
import java.security.MessageDigest
import java.security.PublicKey
import java.security.Signature
import java.security.spec.X509EncodedKeySpec

internal class PlayPurchaseVerifier(private val packageName: String, encodedKey: String) {
  private val key: PublicKey? = runCatching {
    KeyFactory.getInstance("RSA").generatePublic(X509EncodedKeySpec(Base64.decode(encodedKey, Base64.DEFAULT)))
  }.getOrNull()
  val configured: Boolean get() = key != null

  fun verify(purchase: Purchase, accountId: String): Boolean {
    if (key == null || purchase.packageName != packageName ||
      purchase.accountIdentifiers?.obfuscatedAccountId != accountId ||
      purchase.purchaseState != Purchase.PurchaseState.PURCHASED ||
      purchase.purchaseToken.isBlank() || purchase.quantity != 1 || purchase.products.size != 1
    ) return false

    return runCatching {
      Signature.getInstance("SHA1withRSA").run {
        initVerify(key)
        update(purchase.originalJson.toByteArray(Charsets.UTF_8))
        verify(Base64.decode(purchase.signature, Base64.DEFAULT))
      }
    }.getOrDefault(false)
  }

  companion object {
    fun digest(value: String): String = MessageDigest.getInstance("SHA-256")
      .digest(value.toByteArray(Charsets.UTF_8)).joinToString("") { "%02x".format(it) }

    fun accountId(uid: String): String = digest("freeway-escape:play:v1:$uid")
  }
}
