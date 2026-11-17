package com.gridlock

import android.os.Handler
import android.os.Looper
import android.util.Log
import com.android.billingclient.api.BillingClient
import com.android.billingclient.api.BillingClientStateListener
import com.android.billingclient.api.BillingFlowParams
import com.android.billingclient.api.BillingResult
import com.android.billingclient.api.ConsumeParams
import com.android.billingclient.api.PendingPurchasesParams
import com.android.billingclient.api.ProductDetails
import com.android.billingclient.api.Purchase
import com.android.billingclient.api.QueryProductDetailsParams
import com.android.billingclient.api.QueryPurchasesParams
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.ReadableArray

/** Play connections are opened on demand and closed after each operation. */
class GridLockBillingModule(
  private val context: ReactApplicationContext,
) : ReactContextBaseJavaModule(context) {
  private val main = Handler(Looper.getMainLooper())
  private val verifier = PlayPurchaseVerifier(context.packageName, BuildConfig.PLAY_LICENSING_PUBLIC_KEY)
  private val operations = mutableSetOf<Operation>()
  private var catalog: Operation? = null
  private var checkout: Operation? = null
  private val knownProducts = setOf("coins_300", "coins_900", "coins_1800", "coins_3300")

  override fun getName() = "GridLockBilling"

  override fun getConstants(): Map<String, Any> = mapOf("checkoutConfigured" to verifier.configured)

  @ReactMethod
  fun loadPrices(productIds: ReadableArray, purchaseOptionId: String, promise: Promise) {
    val ids = (0 until productIds.size()).mapNotNull(productIds::getString).filter(knownProducts::contains)
    main.post {
      catalog?.resolve(null)
      if (ids.isEmpty()) {
        promise.resolve(null)
        return@post
      }
      val operation = Operation(promise)
      catalog = operation
      operation.connect {
        queryProducts(it, ids) { details ->
          val prices = Arguments.createMap()
          for (product in details) {
            val offer = standardOffer(product, purchaseOptionId) ?: continue
            val price = Arguments.createMap()
            price.putString("formatted", offer.formattedPrice)
            price.putString("currency", offer.priceCurrencyCode)
            price.putDouble("micros", offer.priceAmountMicros.toDouble())
            prices.putMap(product.productId, price)
          }
          it.resolve(prices)
        }
      }
    }
  }

  @ReactMethod
  fun cancelPriceQuery() {
    main.post { catalog?.resolve(null) }
  }

  @ReactMethod
  fun buy(productId: String, uid: String, promise: Promise) {
    main.post {
      if (!verifier.configured || productId !in knownProducts || uid.isBlank() || checkout != null) {
        promise.reject("BILLING_UNAVAILABLE", "Checkout is unavailable.")
        return@post
      }
      val accountId = PlayPurchaseVerifier.accountId(uid)
      val operation = Operation(promise) { session, result, purchases ->
        when (result.responseCode) {
          BillingClient.BillingResponseCode.OK ->
            session.resolve(purchaseResult(purchases, accountId, productId))
          BillingClient.BillingResponseCode.USER_CANCELED ->
            session.resolve(status("cancelled"))
          BillingClient.BillingResponseCode.ITEM_ALREADY_OWNED ->
            session.resolve(status("owned"))
          else -> session.reject()
        }
      }
      checkout = operation
      operation.connect { session ->
        queryProducts(session, listOf(productId)) { details ->
          val activity = context.currentActivity
          val product = details.firstOrNull { it.productId == productId }
          val offerToken = product?.let { standardOffer(it, "buy") }?.offerToken
          if (activity == null || product == null || offerToken.isNullOrBlank()) {
            session.reject()
          } else {
            val item = BillingFlowParams.ProductDetailsParams.newBuilder()
              .setProductDetails(product)
              .setOfferToken(offerToken)
              .build()
            val params = BillingFlowParams.newBuilder()
              .setProductDetailsParamsList(listOf(item))
              .setObfuscatedAccountId(accountId)
              .build()
            session.waitForCheckout()
            val result = session.client.launchBillingFlow(activity, params)
            when (result.responseCode) {
              BillingClient.BillingResponseCode.OK -> Unit
              BillingClient.BillingResponseCode.USER_CANCELED -> session.resolve(status("cancelled"))
              BillingClient.BillingResponseCode.ITEM_ALREADY_OWNED -> session.resolve(status("owned"))
              else -> session.reject()
            }
          }
        }
      }
    }
  }

  @ReactMethod
  fun recover(uid: String, promise: Promise) {
    main.post {
      if (!verifier.configured || uid.isBlank()) {
        promise.reject("BILLING_UNAVAILABLE", "Checkout is unavailable.")
        return@post
      }
      val accountId = PlayPurchaseVerifier.accountId(uid)
      val params = QueryPurchasesParams.newBuilder().setProductType(BillingClient.ProductType.INAPP).build()
      Operation(promise).connect { session ->
        session.client.queryPurchasesAsync(params) { result, purchases ->
          main.post {
            if (session.open) {
              if (result.responseCode == BillingClient.BillingResponseCode.OK) {
                session.resolve(purchaseResult(purchases, accountId))
              } else session.reject()
            }
          }
        }
      }
    }
  }

  @ReactMethod
  fun consume(token: String, promise: Promise) {
    main.post {
      val params = ConsumeParams.newBuilder().setPurchaseToken(token).build()
      Operation(promise).connect { session ->
        session.client.consumeAsync(params) { result, _ ->
          main.post {
            if (result.responseCode == BillingClient.BillingResponseCode.OK ||
              result.responseCode == BillingClient.BillingResponseCode.ITEM_NOT_OWNED
            ) session.resolve(null) else session.reject()
          }
        }
      }
    }
  }

  override fun invalidate() {
    main.post { operations.toList().forEach { it.resolve(null) } }
    super.invalidate()
  }

  private fun standardOffer(product: ProductDetails, optionId: String) =
    product.oneTimePurchaseOfferDetailsList?.firstOrNull {
      it.purchaseOptionId == optionId && it.offerId == null && it.rentalDetails == null && it.preorderDetails == null
    }

  private fun queryProducts(session: Operation, ids: List<String>, callback: (List<ProductDetails>) -> Unit) {
    val products = ids.map {
      QueryProductDetailsParams.Product.newBuilder()
        .setProductId(it).setProductType(BillingClient.ProductType.INAPP).build()
    }
    val params = QueryProductDetailsParams.newBuilder().setProductList(products).build()
    session.client.queryProductDetailsAsync(params) { result, details ->
      main.post {
        if (session.open) {
          if (result.responseCode == BillingClient.BillingResponseCode.OK) callback(details.productDetailsList)
          else session.reject()
        }
      }
    }
  }

  private fun status(value: String) = Arguments.createMap().apply { putString("status", value) }

  private fun purchaseResult(purchases: List<Purchase>, accountId: String, expectedProduct: String? = null) =
    Arguments.createMap().apply {
      val verified = Arguments.createArray()
      var pending = false
      var invalid = false
      for (purchase in purchases) {
        val product = purchase.products.singleOrNull() ?: continue
        if (BuildConfig.DEBUG || BuildConfig.QA_ENABLED) {
          Log.i("GridLockBilling", "receipt product=$product state=${purchase.purchaseState} quantity=${purchase.quantity} accountPresent=${!purchase.accountIdentifiers?.obfuscatedAccountId.isNullOrBlank()} accountMatches=${purchase.accountIdentifiers?.obfuscatedAccountId == accountId}")
        }
        if (product !in knownProducts || (expectedProduct != null && product != expectedProduct)) continue
        if (purchase.accountIdentifiers?.obfuscatedAccountId != accountId) continue
        if (purchase.purchaseState == Purchase.PurchaseState.PENDING) {
          pending = true
        } else if (verifier.verify(purchase, accountId)) {
          verified.pushMap(Arguments.createMap().apply {
            putString("productId", product)
            putString("token", purchase.purchaseToken)
            putString("receiptId", PlayPurchaseVerifier.digest(purchase.purchaseToken))
          })
        } else invalid = true
      }
      // putArray transfers ownership to the map. Read size before that transfer.
      putString("status", when {
        verified.size() > 0 -> "purchased"
        invalid -> "invalid"
        pending -> "pending"
        expectedProduct != null -> "unavailable"
        else -> "empty"
      })
      putArray("purchases", verified)
    }

  private inner class Operation(
    private val promise: Promise,
    listener: (Operation, BillingResult, List<Purchase>) -> Unit = { _, _, _ -> },
  ) {
    var open = true
      private set
    private val timeout = Runnable { reject() }
    val client = BillingClient.newBuilder(context)
      .setListener { result, purchases ->
        main.post { if (open) listener(this, result, purchases.orEmpty()) }
      }
      .enablePendingPurchases(PendingPurchasesParams.newBuilder().enableOneTimeProducts().build())
      .build()

    fun connect(ready: (Operation) -> Unit) {
      operations.add(this)
      main.postDelayed(timeout, 12_000)
      client.startConnection(object : BillingClientStateListener {
        override fun onBillingSetupFinished(result: BillingResult) {
          main.post {
            if (open) {
              if (result.responseCode == BillingClient.BillingResponseCode.OK) ready(this@Operation)
              else reject()
            }
          }
        }
        override fun onBillingServiceDisconnected() {
          main.post { reject() }
        }
      })
    }

    fun waitForCheckout() {
      main.removeCallbacks(timeout)
      main.postDelayed(timeout, 5 * 60_000)
    }

    fun resolve(result: Any?) {
      if (finish()) promise.resolve(result)
    }

    fun reject() {
      if (finish()) promise.reject("BILLING_UNAVAILABLE", "Google Play Billing is unavailable. Try again.")
    }

    private fun finish(): Boolean {
      if (!open) return false
      open = false
      operations.remove(this)
      if (catalog === this) catalog = null
      if (checkout === this) checkout = null
      main.removeCallbacks(timeout)
      client.endConnection()
      return true
    }
  }
}
