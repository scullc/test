import {
  ChangeDetectionStrategy,
  DoCheck,
  Inject,
  NgZone,
  OnDestroy,
  ViewChild,
  Input,
  Output,
  EventEmitter,
  ElementRef
} from '@angular/core';
import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import {
  AbstractControl,
  FormBuilder,
  FormControl,
  FormGroup,
  ValidationErrors,
  ValidatorFn,
  Validators,
} from '@angular/forms';
import { DialogPosition, MatDialog, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatRadioChange } from '@angular/material/radio';
import { isNumber } from '@ng-bootstrap/ng-bootstrap/util/util';
import {
  ActiveCartService,
  CmsAddToCartComponent,
  Product,
  ProductActions,
  ProductScope,
  ProductService,
  RoutingService
} from '@spartacus/core';
import {
  AddToCartComponent,
  CmsComponentData,
  CurrentProductService,
  MediaService,
  ModalService,
} from '@spartacus/storefront';
import { BehaviorSubject, Observable } from 'rxjs';
import { distinctUntilChanged, filter, map, switchMap } from 'rxjs/operators';
import { Store } from '@ngrx/store';
import {
  fileProgress,
  GlobalState,
  selectProductDetail,
  selectProductSizeGuideDetail,
  addToBundleSummaryData,
  selectVAData,
  bulkAddToCart
} from 'src/app/_ngrx/selectors/global.selectors';
// import { WwgToastComponent } from 'src/app/shared/wwg-toast/wwg-toast.component';
import { CartComponent } from '../../cart/cart-List/cart.component';
import { WwgPdpService } from '../wwg-pdp.service';
import { ApiService } from 'src/app/shared/service/api-service.service';
import { CustomiseProductModalComponent } from '../customise-product-modal/customise-product-modal.component';
import { UserAccountFacade } from '@spartacus/user/account/root';
import {
  FetchAddBundleToSummaryAction,
  FetchPdpBreadcrumbs,
  FetchProductDetails,
  FetchProductSizeGuideDetails,
  FetchVAAction,
  FileUploadProgress,
  GlobalFailureToastMsgAction,
  GlobalSuccessToastMsgAction,
  LoadVASuccess,
  SaveProductDetails,
  FetchBundleSummaryAction,
  LoadAddToBundleSummaryAction,
  LoadBulkAddToCart
} from 'src/app/_ngrx/actions/global.actions';
import { HttpEventType } from '@angular/common/http';
import { WwgFileUploadComponent } from 'src/app/shared/wwg-file-upload/wwg-file-upload.component';
import { MatSelectChange } from '@angular/material/select';
import { SizeguideComponent } from '../sizeguide/sizeguide.component';
import { ActivatedRoute, Router, NavigationEnd } from '@angular/router';
import { PacksServiceService } from '../../packs/packs-service.service';
import { Location } from '@angular/common';
import { BulkOrderModalComponent } from '../bulk-order-modal/bulk-order-modal.component';
import { errMsg } from 'src/app/shared/base_en_config';
declare let $: any;

@Component({
  selector: 'app-product-intro',
  templateUrl: './product-intro.component.html',
  styleUrls: ['./product-intro.component.scss'],
  changeDetection: ChangeDetectionStrategy.Default,
})
export class ProductIntroComponent
  extends AddToCartComponent
  implements OnInit, OnDestroy, DoCheck
{
  progress = 0;
  accept = [
    'application/pdf',
    'image/jpeg',
    'image/png',
    'image/tiff',
    'image/gif',
    'image/heic',
  ];
  dimensionSortOrder: { [key: string]: number } = { R: 0, L: 1, S: 2 };
  // products: any;
  // @ViewChild('toast') toast: WwgToastComponent;
  @Input() getProductCode: any;
  @Input() exchange: any;
  @Input() itemForm: any;
  @Input() pdpUrlLink:any;
  @Input() sizeExchangeFlag :any;
  @Input() getOriginalSKU: any;
  @Output() pdpFormData = new EventEmitter<any>();
  @Input() totalPriceOfOriginalProduct: any;
  @Input() selectedQtyOfOriginalProduct: any;
  @Input() getOriginalPackType: any;
  @Input() getOriginalPackID: any;
  @Input() getOriginalRoleName: any;
  @Input() lengthFit: any;
  @Output() sizeAvailables = new EventEmitter<any>();
  @Input() exchangePreDimention: any;
  @Input() sizeOnlyFlag: boolean;
  @Input() originalProdCode: any;
  @Input() isSubstituteEntry: boolean;

  @ViewChild('fileUpload') fileUpload: WwgFileUploadComponent;
  replacement: any;
  quantity = 1;
  maxQuantity = 10;
  productCode: any = 1;
  selectedColor: string = '';
  selectedSize: string | null;
  levels: any = [];
  selectedColorVariant: Variant;
  selectedFitVariant: Variant | null;
  selectedSizeVariant: Variant | null;
  variantType = VariantType;
  selectedVA: string = '';
  selectedVAParentKey: string = '';
  innerWidth = window.screen.width;
  vaEnabled: boolean = false;
  customClicked:boolean = false;
  profileData: any;
  uid: any;
  slideout = false
  colorBoolean = true
  showLoader : boolean = false;
  errorMessage: any;
  errorSubject: any;
  showErrorDisplay: boolean = false;

  pdpForm = new FormGroup(
    {
      color: new FormControl('', [Validators.required]),
      lengthandfit: new FormControl('', [Validators.required]),
      sizes: new FormControl('', [Validators.required]),
     // reasonForReplacement: new FormControl('', [Validators.required]), // added conditional validators
      reasonForReplacement: new FormControl(''), 
      //additionalComments: new FormControl('', [Validators.required]), // as this is optioanl
      additionalComments: new FormControl(''),
      quantity: new FormControl(1, { updateOn: 'blur' }),
      attachments: new FormControl('', []),
      reasonForSelfPurchase: new FormControl(''),
      reasonForReplacementComments: new FormControl(''),
    },
    {
      validators: this.fileSizeValidator(),
    }
  );
  @Input()
  showError: boolean = false;
  stockCount: any;
  selectedVaOption: any = {};
  stockMessage: string = '';
  stockLevelNumber: number = 0;
  showLevel: boolean = false;

  reasonForReplacementValue: any;
  showFileUploader: boolean = false;
  showReasonForReplacementComments: boolean = false;
  selectedPurchaseOption: any;
  purchaseOptionsCount: number = 0;
  purchaseOptions: any = [];
  purchaseOptionsOrder = {
    'replacement': null,
    'selfPurchase': null,
    'bulkPurchase': null,
  }
  getProductResponse: any;
  quickAddtoCart: boolean = false;
  isPackPage: boolean
  mainImage: any;
  altContent: any;
  sizes: any
  isSizeguideAvailable:boolean = false;
  sizeGuide$ = this.store.select(selectProductSizeGuideDetail);
  roleId = localStorage.getItem('packId')
  // packId = localStorage.getItem('CategorypackId')
  // packType = localStorage.getItem('CategoryPackType')
  packId = localStorage.getItem('packId');
  selectedPackID = localStorage.getItem('selectedPackID');
  packType = localStorage.getItem('packType');
  packName = localStorage.getItem('packName');
  //FLYR2-35
  showOptionalCustomizationInfo : boolean = false;
  showMandatoryCustomizationError : boolean = false;
  mandatoryCustomizationApplied : boolean = false;
  selectVADataSub : any;
  mandatoryVA : boolean = false;
  AvailableVaOptions : any = {};
  bulkOrderRole: boolean = false;

  defaultShowPrice : any;
  isWearer: boolean;
  bulkAddToCartSub: any;
  disablePackCTA: boolean = false;
 
  mandatoryVAEmptyRule : boolean = false;
  routerSubscription: any;
  constructor(
    protected fb: FormBuilder,
    modalService: ModalService,
    currentProductService: CurrentProductService,
    cd: ChangeDetectorRef,
    activeCartService: ActiveCartService,
    private _ngZone: NgZone,
    private pdpService: WwgPdpService,
    private store: Store<GlobalState>,
    private userService: UserAccountFacade,
    private dialog: MatDialog,
    private productService: ProductService,
    private mediaService: MediaService,
    private apiService: ApiService,
    private activatedRoute: ActivatedRoute,
    private packService: PacksServiceService,
    private router: Router,
    private location: Location,
    private elementRef: ElementRef,
    @Inject(MAT_DIALOG_DATA) public data: any,
  ) {
    super(modalService, currentProductService, cd, activeCartService);
  }

  ngOnInit(): void {
    this.routerSubscription = this.router.events.subscribe(event => {
      if (event instanceof NavigationEnd) {
        setTimeout(
          ()=>{
            window.scrollTo(0, 0);
         }, 400
        );
      }
    });
    this.bulkAddToCartSub = this.store.select(bulkAddToCart).subscribe((res)=>{
      if(Object.keys(res).length>0){
        this.handleBulkAddToCartResp(res)
      }
      this.cd.markForCheck();
    })
    if(localStorage.getItem('selectedUser') != null) {
      let userDetail = JSON.parse(localStorage?.selectedUser);
      if(userDetail?.isBulkOrder){
        this.bulkOrderRole = true
      } else {
        this.bulkOrderRole = false;
      }
    } else {
      this.bulkOrderRole = false
    }
    this.store.select(fileProgress).subscribe((res: any) => {
      this.progress = res;
      this.cd.markForCheck();
    });
    if(this.data?.productId?.length>0) {
      // this.store.dispatch(
      //       new ProductActions.LoadProduct(this.data.productId,ProductScope.DETAILS)
      // );
      let unEncodedRoleName : any = this.packId;
      let enodedRoleName= encodeURIComponent(unEncodedRoleName);
      let payload = {
        productCode: this.data?.productId,
        roleName: enodedRoleName,
        packType: this.packType,
        selectedPackID: this.selectedPackID
      }
      this.store.dispatch(new FetchProductDetails(payload))
      this.getProductResponse = this.store.select(selectProductDetail).subscribe((res)=>{
        if(Object.keys(res).length>0){
          if(this.data?.isPackPage == true) {
            this.isPackPage = true
            this.quickAddtoCart = false
          } else {
            this.isPackPage = false
            this.quickAddtoCart = true
          }
          const data = Object.assign({code: this.data?.productId}, res);
          this.initProductData(data);
        }
      })
        // this.getProductResponse = this.productService.get(this.data.productId,ProductScope.DETAILS).subscribe((res)=>{
        //   console.log(res)
        //     this.initProductData(res);
        // })

    }else if(this.getProductCode != undefined){
      let payload;
      if(this.sizeOnlyFlag && this.isSubstituteEntry) {
        payload = {
          productCode: this.originalProdCode,
          roleName: this.getOriginalRoleName,
          packType: this.getOriginalPackType,
          selectedPackID: this.getOriginalPackID,
          sizeOnlyFlag: this.sizeOnlyFlag
        }
      } else {
        payload = {
          productCode: this.sizeOnlyFlag ? this.getOriginalSKU : this.getProductCode,
          roleName: this.getOriginalRoleName,
          packType: this.getOriginalPackType,
          selectedPackID: this.getOriginalPackID,
          sizeOnlyFlag: this.sizeOnlyFlag
        }
      } 
      this.store.dispatch(new SaveProductDetails({}))
      this.store.dispatch(new FetchProductDetails(payload))
      this.getProductResponse = this.store.select(selectProductDetail).subscribe((res)=>{
        if(Object.keys(res).length>0){
          const data = Object.assign({code: this.getProductCode}, res);
          this.initProductData(data);
        }
      })
    } else {
      this.dialog.closeAll();
      this.quickAddtoCart = false;
      let clickedFromExchange = this.activatedRoute.snapshot.queryParamMap.get('exchange');
      let role = this.activatedRoute.snapshot.queryParamMap.get('roleName');
      let packType = this.activatedRoute.snapshot.queryParamMap.get('packType')
      let packId = this.activatedRoute.snapshot.queryParamMap.get('packId')
      let payload = {}
      if(clickedFromExchange != null && role != null && packType !=null && packId != null) { 
        payload = {
          productCode: this.activatedRoute.snapshot.params.productCode,
          roleName: role,
          packType: packType,
          selectedPackID: packId
        }
        this.removeQueryParamsAfterNavigation()
      } else {
        let unEncodedRoleName : any = this.packId;
        let enodedRoleName= encodeURIComponent(unEncodedRoleName);
        payload = {
          productCode: this.activatedRoute.snapshot.params.productCode,
          roleName: enodedRoleName,
          packType: this.packType,
          selectedPackID: this.selectedPackID
        }
      }
      
      this.store.dispatch(new FetchProductDetails(payload))
      this.getProductResponse = this.store.select(selectProductDetail).subscribe((res)=>{
        if(Object.keys(res).length>0){
          if(this.isPackPage == undefined) {
            this.isPackPage = false
          }
          const data = Object.assign({code: this.activatedRoute.snapshot.params.productCode}, res);
          this.initProductData(data);
        }
      })
      // this.currentProductService.getProduct().subscribe((res) => {
      //   this._ngZone.run(() => {
      //     this.initProductData(res);
      //   });
      // });
    }

    this.userService.get().subscribe((res) => {
      this.profileData = res;
      this.uid = this.profileData?.uid ? this.profileData?.uid : 'Not provided';
      this.isWearer = this.profileData?.isWearer;
    });
    this.selectVADataSub = this.store.select(selectVAData).subscribe((res)=>{
      this.mandatoryVA = false;
      this.mandatoryVAEmptyRule = true;
      
      this.vaEnabled = false;
      if(res != undefined && Object.keys(res).length>0){
        if(res?.valueAddList != undefined){
        this.vaEnabled = true;
        this.AvailableVaOptions = res;
        for(let vAdd of res?.valueAddList){
          if(vAdd?.mandatory == true){
            this.mandatoryVA = true
          }
          for (let  prompt of vAdd?.prompts) {
            if(prompt?.promptRule != '' || vAdd?.checkboxDisplay){
              this.mandatoryVAEmptyRule = false; 
            }
          }
        }
        // create object if all promp rule blank : FLYR2-6869 AC 2
        if(this.mandatoryVAEmptyRule) {
          let payloadEmptyRuleObj = this.createPayloadEmptyRule(res?.valueAddList)
          if(payloadEmptyRuleObj != null)
            localStorage.setItem('VAItems-' + this.products.code + '-' + this.selectedColorVariant?.code?.code, JSON.stringify(payloadEmptyRuleObj)); 
        }

        if(this.products?.code!=undefined)
          this.selectedVaOption = JSON.parse(localStorage.getItem('VAItems-' + this.products.code + '-' + this.selectedColorVariant?.code?.code) || '{}' );
        if (this.selectedVaOption && Object.keys(this.selectedVaOption).length > 0) {
          this.selectedVA = this.selectedVaOption?.valueAdd[0].name;
        } else {
          this.selectedVA = '';
        }
      }
      }
      this.cd.markForCheck();
    })
  }
  event(){
    this.slideout = !this.slideout
    // const dialogPosition: DialogPosition = {
    //   top: '-1px',
    //   right: '0px'
    // }

    if(this.innerWidth <= 992){
      const  dialogRef = this.dialog.open(SizeguideComponent,{
        // width:'100%',
        height:'100%',
        minWidth: '100%',
        position: {
          top: '0px',
          right: '0px'
        },
        data: {
          id:this.products.code,
          sizes:this.products.sizeCodes
        },
        panelClass:['animate__animated','animate__slideInRight','cart']
      })
    } else {
      const  dialogRef = this.dialog.open(SizeguideComponent,{
        width: '850px',
        height:'100%',
        position: {
          top: '0px',
          right:'0px'
        },
        data: {
          id:this.products.code,
          sizes:this.products.sizeCodes
        },
        panelClass:['animate__animated','animate__slideInRight','cart']
      })
    }
    
  }

  removeQueryParamsAfterNavigation(): void {
    this.location.replaceState(this.location.path().split('?')[0]);
  }

  ngDoCheck(): void {
    if(this.quickAddtoCart || this.isPackPage){
      this.pdpService.colorImages.subscribe((res)=>{

        // this.colorImages = res
        // this.productImages = []
        // this.mainImage = ''
        res.images?.forEach((res: any)=>{
          if(res?.imageType == 'PRIMARY' && res?.format == 'product'){
            this.mainImage = this.mediaService?.getMedia(res)?.src
            this.altContent = this.mediaService?.getMedia(res)?.alt
          }
          // if(res?.imageType == 'GALLERY' && res?.format == 'thumbnail'){
          //  this.productImages.push(this.mediaService?.getMedia(res))
          // }
        })
      })
    }
  }

  products: any;

  initProductData(res: any) {
    this.store.dispatch(new FetchProductSizeGuideDetails(res?.code ? res?.code : this.getProductCode));
      this.sizeGuide$.subscribe((res) => {
      if(!res?.dimensions){
        this.isSizeguideAvailable = false;
      }
      else{
        this.isSizeguideAvailable = true;
      }
      this.cd.markForCheck();
      })
    this.products = res;
    this.userService.get().subscribe((res: any) => {
      let unEncodedRoleName : any = this.packId;
      let enodedRoleName= encodeURIComponent(unEncodedRoleName);
      let unEncodedpackName : any = this.packName;
      let enodedpackName= encodeURIComponent(unEncodedpackName);
      if(localStorage.getItem('isProxyModeEnabled') == 'true') {
        // let userId: any = JSON.parse(localStorage.getItem('selectedUser'))
        let userId = JSON.parse(localStorage.getItem('selectedUser') || '{}');
        const payload = {
          productCode : this.products.code,
          userId: userId.uid,
          roleName: enodedRoleName,
          packName: enodedpackName,
          packType: this.packType,
          selectedPackID: this.selectedPackID
        }
        this.store.dispatch(new FetchPdpBreadcrumbs(payload)) 
      } else {
        const payload = {
          productCode : this.products.code,
          userId: res?.uid,
          roleName: enodedRoleName,
          packName: enodedpackName,
          packType: this.packType,
          selectedPackID: this.selectedPackID
        }
        this.store.dispatch(new FetchPdpBreadcrumbs(payload))
      }
    });
    // this.productCode = this.products?.code;
    // this.products.sizeCodes = this.products?.sizeCodes
    //   .slice()
    //   .sort((a: any, b: any) => (parseInt(a.name) < parseInt(b.name) ? -1 : 1));
    this.levels = []
    this.initDefaultSelection();
    this.sizes = this.getSizes()
    this.populateVariantLevel(this.products?.variants[0]);
    if(this.products?.packType?.toLowerCase() != 'selfpurchase') {
      this.generatePurchaseOptions(this.products?.purchaseOptions);
    }
    this.cd.markForCheck();
  }

  generatePurchaseOptions(options: any) {
    this.purchaseOptionsCount = 0;
    let optionObj = Object.assign(this.purchaseOptionsOrder, options);
    this.purchaseOptions = Object.entries(optionObj).map(([key, value]) => ({key,value}));
    let result = this.purchaseOptions.filter((option: any) => option.value == true);
    this.purchaseOptionsCount = result.length;
    if(result.length > 0){
      this.selectedPurchaseOption = result[0].key;
    }
    this.setCustomValidators();
  }
  
  onPurchaseOptionSelected(event: MatRadioChange) {
    this.selectedPurchaseOption = event.value;
    this.setCustomValidators();
  }

  // conditional validation on reasonForReplacement & reasonForReplacementComments
  setCustomValidators() {
    const reason = this.pdpForm.get('reasonForReplacement');
    const reasonCmt = this.pdpForm.get('reasonForReplacementComments');
    if(this.selectedPurchaseOption == 'replacement'){
      reason?.setValidators([Validators.required]);
    } else {
      reason?.setValidators(null);
    }

    if((this.reasonForReplacementValue == 'Incident' || this.reasonForReplacementValue == 'Change of circumstance') && this.selectedPurchaseOption == 'replacement'){
      reasonCmt?.setValidators([Validators.required])
    } else {
      reasonCmt?.setValidators(null);
    }
    reason?.updateValueAndValidity();
    reasonCmt?.updateValueAndValidity();
  }

  onReasonForReplacementChange(event: MatSelectChange){
    this.reasonForReplacementValue = event.value;
    if(this.reasonForReplacementValue == 'Incident' || this.reasonForReplacementValue == 'Change of circumstance' || this.reasonForReplacementValue == 'General purchase'){
      this.showFileUploader = false;
      this.showReasonForReplacementComments = true;
    } else {
      this.showReasonForReplacementComments = false;
      this.showFileUploader = true;
    }
    this.setCustomValidators()
  }
 
  initExchangeSelection(){
    this.dimentions.sort(this.sortByCustomOrder.bind(this));
    var color = this.itemForm.controls['color'].value;
    var dimention = this.itemForm.controls['dimention'].value;
    var size = this.itemForm.controls['size'].value;
    // set dimention which user selected  at the time of order placement - FLYR2-5849 AC1
    // if(dimention != undefined && dimention == "" && this.exchangePreDimention!= undefined && this.exchangePreDimention!= '') {
    //   dimention = this.exchangePreDimention
    // }
    
    if(color != undefined &&  color != "") {
      if(this.selectedColorVariant == undefined) {
        this.selectedColorVariant = color;
        this.onColorSelected(color.code);
      }
    }
    if(dimention != undefined && dimention != "") {
      if(this.selectedFitVariant == undefined) {
        this.selectedFitVariant = dimention;
        this.onLengthAndFitSelected(dimention.code);
      }
    }

    if(size != undefined && size != "") {
      if(this.selectedSizeVariant == undefined){
        this.selectedSizeVariant = size;
        this.onSizeSelected(size.code);
        this.getCustomizationAvailability()
      }
      
    }

    //emmit size array
    let availableSize = !this.isEmptyColorVariant() && !this.isEmptySizeVariant();
    this.sizeAvailables.emit(availableSize)
  }

  sortByCustomOrder(a: { code: { code: string | number; }; }, b: { code: { code: string | number; }; }) {
    if (!a.code || !this.dimensionSortOrder[a.code.code]) return 1;
    if (!b.code || !this.dimensionSortOrder[b.code.code]) return -1;
    if (this.dimensionSortOrder[a.code.code] < this.dimensionSortOrder[b.code.code]) return -1;
    if (this.dimensionSortOrder[a.code.code] > this.dimensionSortOrder[b.code.code]) return 1;
    console.log(a.code, b.code);
    return 0;
  }

  isColorSelected(color: any, i:any){
    var colorValue = this.itemForm?.controls['color']?.value;
    if(this.exchange == true && colorValue != undefined && colorValue != "") {
      return color?.code == colorValue?.code?.code;
    } 
    return !this.colorBoolean ? color?.code == this.selectedColorVariant?.code?.code : i==0? this.getDefaultSelectedColor(color): false
  }

  initDefaultSelection() {
    let rootVariant: any;
    if(this.exchange) {
      this.initExchangeSelection();
    }
    this.initializeVariant();
    if (this.selectedColorVariant == null) {
      if (!this.isEmptyColorVariant()) {
        this.products?.variants?.filter((res: any) => {
          if (
            this.products?.code.split('-')[1] === res?.productCode.split('-')[1]
          ) {
            rootVariant = res;
            if (rootVariant) {
              let type = this.checkVariantType(rootVariant);
              if (type == this.variantType.Color) {
                this.selectedColorVariant = rootVariant;
                this.pdpService.colorImages.next(this.selectedColorVariant);
                this.selectedFitVariant = rootVariant?.variants[0];
                this.sizes = this.getSizes()
              }
            }
          } else {
            rootVariant = this.products?.variants[0];
            if (rootVariant) {
              let type = this.checkVariantType(rootVariant);
              if (type == this.variantType.Color) {
                this.selectedColorVariant = rootVariant;
                this.pdpService.colorImages.next(this.selectedColorVariant);
                this.selectedFitVariant = rootVariant?.variants[0];
                this.sizes = this.getSizes()
              }
            }
          }
        });
        // rootVariant = this.products?.variants[0];
      }
    } else {
      rootVariant = this.selectedColorVariant;
      this.pdpService.colorImages.next(this.selectedColorVariant);
      this.selectedFitVariant = rootVariant?.variants[0];
      this.sizes = this.getSizes()
    }
  }

  getVariantByCode(variants: Variant[], code: string) {
    return variants?.filter((it: Variant) => it.code.code == code);
  }

  getVariantAndType(variantItems: Variant[], code: string) {
    let variants = this.getVariantByCode(variantItems, code);
    let variant: Variant | null = variants?.length > 0 ? variants[0] : null;
    let type = this.checkVariantType(variant);
    return {
      type: type,
      variant: variant,
    };
  }

  initializeVariant() {
    // this.updateVariants();
    if (this.products?.code != null) {
      let codes = this.products.code.split('-');
      if (codes.length < 0) return;

      let emptyColor = this.isEmptyColorVariant();
      let emptyFit = this.isEmptyFitVariant();
      if (emptyColor) {
        this.selectedColorVariant = this.products?.variants[0];
        if (emptyFit) {
          this.selectedFitVariant = this.products?.variants[0]?.variants[0];
        }
      }

      if (emptyColor && !emptyFit) {
        let subData = this.getVariantAndType(
          this.selectedColorVariant.variants,
          codes[2]
        );
        if (subData.variant != null && subData.type == VariantType.Fit) {
          this.selectedFitVariant = subData.variant;
        }
      }

      if (!emptyColor && !emptyFit) {
        let data = this.getVariantAndType(this.products.variants, codes[1]);
        if (data.variant != null && data.type == VariantType.Color) {
          this.selectedColorVariant = data.variant;
          if (codes.length > 2) {
            let subData = this.getVariantAndType(
              data.variant.variants,
              codes[2]
            );
            if (subData.variant != null && subData.type == VariantType.Fit) {
              this.selectedFitVariant = subData.variant;
            }
          }
        }
      }
    }
  }

  pdpCart() {
    this.showError = true;
    this.showMandatoryVAError();
    this.showLoader = true;
    if (
      (this.products?.packType?.toLowerCase() == 'self-purchase' &&
      (!this.pdpForm.controls['lengthandfit'] || this.pdpForm.get('lengthandfit')?.valid) &&  
      this.pdpForm.get('sizes')?.valid && 
      !this.showMandatoryCustomizationError)
      ||

      (this.pdpForm.get('sizes')?.valid &&  
      this.pdpForm.get('reasonForReplacement')?.valid &&
      this.pdpForm.get('reasonForReplacementComments')?.valid &&
      this.pdpForm.get('attachments')?.valid &&
      !this.showMandatoryCustomizationError)
    ) {
      let payload: any = {
        code: '',
        quantity: this.pdpForm.get('quantity')?.value,
        reasonForReplacement: '',
        additionalComments: '',
        replacementDocuments: '',
        reasonForSelfPurchase: '',
        specifyText: '',
        purchaseType: this.selectedPurchaseOption,
        packType: this.products.packType,
        packID: this.products.selectedPackID,
        roleName: this.products.roleId
      };
      if(this.selectedVaOption?.valueAdd!= undefined && Object.entries(this.selectedVaOption?.valueAdd).length>0){
        let i = 0;        
        Object.entries(this.selectedVaOption?.valueAdd).forEach(([key, value]) => {
        let j = 0;
        payload["selectedValueAdd["+i+"].parentKey"] = this.selectedVaOption?.valueAdd[key]?.parentKey;
        payload["selectedValueAdd["+i+"].code"] = this.selectedVaOption?.valueAdd[key]?.code;
        payload["selectedValueAdd["+i+"].price"] = this.selectedVaOption?.valueAdd[key]?.price;
        payload["selectedValueAdd["+i+"].name"] = this.selectedVaOption?.valueAdd[key]?.name;
        payload["selectedValueAdd["+i+"].mandatory"] = this.selectedVaOption?.valueAdd[key]?.mandatory;
        if(this.selectedVaOption?.valueAdd[key]?.prompts?.length>0){
            Object.entries(this.selectedVaOption?.valueAdd[key]?.prompts).forEach(([keyPrompt, value]) => {
              payload["selectedValueAdd["+i+"].prompts["+j+"].sequence"] = this.selectedVaOption?.valueAdd[key]?.prompts?.[keyPrompt]?.sequence;
              payload["selectedValueAdd["+i+"].prompts["+j+"].promptId"] = this.selectedVaOption?.valueAdd[key]?.prompts?.[keyPrompt]?.promptId;
              payload["selectedValueAdd["+i+"].prompts["+j+"].optional"] = this.selectedVaOption?.valueAdd[key]?.prompts?.[keyPrompt]?.optional;
              payload["selectedValueAdd["+i+"].prompts["+j+"].prompt1"] = this.checkDefineValue(this.selectedVaOption?.valueAdd[key]?.prompts?.[keyPrompt]?.prompt1);
              payload["selectedValueAdd["+i+"].prompts["+j+"].promptRule"] = this.checkDefineValue(this.selectedVaOption?.valueAdd[key]?.prompts?.[keyPrompt]?.promptRule);
              payload["selectedValueAdd["+i+"].prompts["+j+"].userEnteredValue"] = this.checkDefineValue(this.selectedVaOption?.valueAdd[key]?.prompts?.[keyPrompt]?.userEnteredValue);
              payload["selectedValueAdd["+i+"].prompts["+j+"].prompt2"] = this.checkDefineValue(this.selectedVaOption?.valueAdd[key]?.prompts?.[keyPrompt]?.prompt2);
             ++j
            })
          }
        ++i;
      });
    }
      if (this.selectedVAParentKey.length > 0) {
        payload['valueAddParentKey'] = this.selectedVAParentKey;
      }
      if(this.selectedPurchaseOption == 'replacement' && (this.reasonForReplacementValue == 'Incident' || this.reasonForReplacementValue == 'Change of circumstance' || this.reasonForReplacementValue == 'General purchase') ){
        payload['reasonForReplacement'] = this.pdpForm.get('reasonForReplacement')?.value
        payload['specifyText'] = this.pdpForm.get('reasonForReplacementComments')?.value
      } else if(this.selectedPurchaseOption == 'replacement' && this.reasonForReplacementValue == 'Fair Wear and Tear'){
        payload['reasonForReplacement'] = this.pdpForm.get('reasonForReplacement')?.value
        payload['additionalComments'] = this.pdpForm.get('additionalComments')?.value
        payload['replacementDocuments'] = this.pdpForm.get('attachments')?.value
      } else if(this.selectedPurchaseOption == 'selfPurchase'){
        payload['reasonForSelfPurchase'] = this.pdpForm.get('reasonForSelfPurchase')?.value
      }
      payload.code = this.getSelectedProductCode();
      this.dialog.closeAll();
      this.activeCartService.requireLoadedCart().subscribe((res) => {
        if (res.success == true) {
          this.pdpService.addToCart(payload)?.subscribe((res: any) => {
            if (res.type === HttpEventType.UploadProgress) {
              const precentage = Math.round((100 * res.loaded) / res.total);
              // console.log('Progress ' + precentage + '%');
              this.progress = precentage;
              this.cd.markForCheck();
              return new FileUploadProgress({
                progress: precentage,
              });

            }

            if (res.type === HttpEventType.Response) {
              this.store.dispatch(new FileUploadProgress({ progress: 100 }));
              var cartresponse = res.body;
              this.fileUpload?.removeFiles();
              // this.progress = 0;
              this.cd.markForCheck();
              setTimeout(
                ()=>{
                  this.progress = 0;
                  this.store.dispatch(new FileUploadProgress({ progress: 0 }));
                }, 2000
              );
              if (cartresponse.statusCode == 'success') {
                this.showLoader = false;
                this.pdpService.getCart();
                this.openCart();
              } else if (cartresponse.statusCode == 'noStock') {
                this.showErrorMsg('No Stock Available');
                this.showLoader = false;
              } else {
                this.showErrorMsg(cartresponse.statusCode);
                this.showLoader = false;
              }
            }

            return null;
            // const precentage = Math.round((100 * res.loaded) / res.total);
            // console.log('Progress ' + precentage + '%');
            // return new FileUploadProgress({
            //   progress: precentage,
            // });;
          },
          (error: any) => {
            if (error.status === 400) {
              this.showErrorMsg(error.error.errors[0].message);
            } else {
              this.showErrorMsg(errMsg.er48);
            }
            this.progress = 0;
            this.showLoader = false;
            this.elementRef.nativeElement.querySelector('#addToCartBtn').blur();
            this.store.dispatch(new FileUploadProgress({ progress: 0 }));
            this.cd.markForCheck();
          });
        }
      });
    } else{
      this.showLoader = false
    }
  }

  showSuccessMsg(msg: string) {
    // if (this.toast)
    //   this.toast.showSuccessMsg(msg);
     
    this.store.dispatch(new GlobalSuccessToastMsgAction(msg));
  }

  showErrorMsg(msg: string) {
    // if (this.toast) 
    //   this.toast.showErrorMsg(msg);
     
    this.store.dispatch(new GlobalFailureToastMsgAction(msg));
  }

  openCart() {
    const dialogPosition: DialogPosition = {
      top: '0px',
      right: '0px',
    };

    if (this.innerWidth <= 992) {
      const dialogRef = this.dialog.open(CartComponent, {
        // width:'100%',
        height: '100%',
        minWidth: '100%',
        position: dialogPosition,
        data: {
          cartDetails: {},
        },
        panelClass: ['animate__animated', 'animate__slideInRight', 'cart'],
      });
       dialogRef.afterClosed().subscribe(() => {
        $('html').removeClass('cdk-global-scrollblock'); 
        $('html').removeAttr('style');
    });
    } else {
      const dialogRef = this.dialog.open(CartComponent, {
        width: '531px',
        height: '100%',
        position: dialogPosition,
        data: {
          cartDetails: {},
        },
        panelClass: ['animate__animated', 'animate__slideInRight', 'cart'],
      });
      dialogRef.afterClosed().subscribe(() => {
        $('html').removeClass('cdk-global-scrollblock'); 
        $('html').removeAttr('style');
    });
    }
  }

  getSelectedOriginalCode() {
    if (this.selectedSizeVariant != null && this.selectedSizeVariant.originalCode) {
      // this.pdpService.selectedProductCode.next(this.selectedSizeVariant?.productCode)
      return this.selectedSizeVariant?.originalCode;
    } else if (this.selectedFitVariant != null && this.selectedFitVariant.originalCode) {
      // this.pdpService.selectedProductCode.next(this.selectedFitVariant?.productCode)
      return this.selectedFitVariant?.originalCode;
    } else if (this.selectedColorVariant != null && this.selectedColorVariant.originalCode) {
      // this.pdpService.selectedProductCode.next(this.selectedColorVariant?.productCode)
      return this.selectedColorVariant?.originalCode;
    }
    return '';
  }

  getSelectedProductCode() {
    if (this.selectedSizeVariant != null && this.selectedSizeVariant.productCode) {
      // this.pdpService.selectedProductCode.next(this.selectedSizeVariant?.productCode)
      return this.selectedSizeVariant?.productCode;
    } else if (this.selectedFitVariant != null && this.selectedFitVariant.productCode) {
      // this.pdpService.selectedProductCode.next(this.selectedFitVariant?.productCode)
      return this.selectedFitVariant?.productCode;
    } else if (this.selectedColorVariant != null && this.selectedColorVariant.productCode) {
      // this.pdpService.selectedProductCode.next(this.selectedColorVariant?.productCode)
      return this.selectedColorVariant?.productCode;
    }
    return '';
  }

  selectedProductVariant: string;

  get colors() {
    if (this.products && this.products.colourCodes) {
      return this.products.colourCodes;
    }
    return null;
  }

  get dimentions() {
    if (this.selectedColorVariant) {
      let dimentionVariant = this.products?.variants?.filter((it: any) =>
        it?.code?.code != undefined
          ? it?.code?.code == this.selectedColorVariant?.code?.code
          : it?.code == this.selectedColorVariant?.code?.code
      );

      if (dimentionVariant?.length > 0) return dimentionVariant[0]?.variants;
    }

    if (this.products && this.products.dimensionCodes) {
      return this.products.dimensionCodes;
    }
    return null;
  }

  getSizes() {
    // if (this.selectedFitVariant) {
    this.products.sizeCodes = this.products?.sizeCodes.map((size: any) => {
      let enabled = this.isSizePresent(size);
      return {
        ...size,
        enabled: enabled,
      };
    });
    return this.products.sizeCodes;
    // }

    if (this.products && this.products.sizeCodes) {
      return this.products.sizeCodes;
    }
    return null;
  }

  isEmptyFitVariant() {
    return this.products && this.products?.dimensionCodes?.length == 0;
  }

  isEmptyColorVariant() {
    return this.products && this.products?.colourCodes?.length == 0;
  }

  isEmptySizeVariant() {
    return this.products && this.products?.sizeCodes?.length == 0;
  }

  getFilterVariantArray(variants: Variant[]) {
    let filteredvariants: Variant[] = [];
    variants.forEach((item) => {
      if (Object.keys(item.code).length == 0) {
        filteredvariants = item.variants;
      }
    });
    return filteredvariants;
  }

  isSizePresent(size: any) {
    let sizePresent = false;
    if (this.isEmptyColorVariant()) {
      let variants = this.getFilterVariantArray(this.products.variants);
      if (this.isEmptyFitVariant()) {
        let fitVariants = this.getFilterVariantArray(variants);
        this.defaultShowPrice = fitVariants[0].price?.formattedValue;
        return (
          fitVariants.filter((it: any) => it.code?.code == size.code).length > 0
        );
      } else if (this.selectedFitVariant == null) {
        return true;
      }
    } else if (this.isEmptyFitVariant()) { 
      let fitVariants = this.getFilterVariantArray(
        this.selectedColorVariant.variants
      );

      this.defaultShowPrice = fitVariants[0]?.price?.formattedValue;

      return (
        fitVariants.filter((it: any) => it?.code?.code == size?.code).length > 0
      );
    }

    if (this.selectedFitVariant != null) {
      sizePresent =
        this.selectedFitVariant.variants.filter(
          (it: any) => it.code?.code == size.code
        ).length > 0;

        this.defaultShowPrice = this.selectedFitVariant.variants[0].price?.formattedValue;
    }
    return sizePresent;
  }

  checkVariantType(variant: Variant | null) {
    let colorType = this.validateType(this.colors, variant);
    if (colorType) return this.variantType.Color;

    let dimentionType = this.validateType(this.dimentions, variant);
    if (dimentionType) return this.variantType.Fit;

    let sizeType = this.validateType(this.sizes, variant);
    if (sizeType) return this.variantType.Size;

    return null;
  }

  validateType(items: any, variant: Variant | null) {
    if (items) {
      let colorCode = items.filter((it: any) => {
        return it.code?.code != undefined
          ? it.code?.code == variant?.code?.code
          : it.code == variant?.code?.code;
      });

      if (colorCode.length > 0) return true;
    }
    return false;
  }

  get itemlevels() {
    return this.levels;
  }

  populateVariantLevel(variant: Variant) {
    if (variant != null) {
      this.levels.push(this.checkVariantType(variant));
      if (variant.variants != null && variant.variants?.length > 0) {
        this.populateVariantLevel(variant.variants[0]);
      }
    }
  }

  getSizeVariants() {
    if (this.selectedFitVariant == null || this.isEmptyFitVariant()) {
      if (this.isEmptyColorVariant()) {
        let variants = this.getFilterVariantArray(this.products.variants);
        let sizeVariants = this.getFilterVariantArray(variants);
        return sizeVariants;
      } else {
        if (this.isEmptyFitVariant()) {
          let sizeVariants = this.getFilterVariantArray(
            this.selectedColorVariant.variants
          );
          return sizeVariants;
        }
      }
    }
    return this.selectedFitVariant?.variants;
  }

  onSizeSelected(value: any) {
    if(value?.name.toLowerCase() == "custom") {
      this.customClicked = true;
    }
    else {
      this.customClicked = false;
    }
    if (this.isSizePresent(value) || this.exchange == true) {
      this.selectedSize = value.name;
      let sizeVariant = this.getSizeVariants()?.filter(
        (it: Variant) => it?.code?.code == value?.code
      );
      // console.log("sizeVariant",sizeVariant);
      if (sizeVariant && sizeVariant.length > 0)
        this.selectedSizeVariant = sizeVariant[0];
      this.pdpService.selectedProductCode.next(
        this.selectedSizeVariant?.productCode
      );
      this.pdpForm.controls['sizes'].setValue(value);
    }
    this.stockMessage = '';
    this.stockLevelNumber = 0;
    this.getStockAvilability();
    this.submitSkuSelection();
  }

  submitSkuSelection(){
    let vaKeyText: string = '';
    vaKeyText = 'VAItems-' + this.products.code + '-' + this.selectedColorVariant?.code?.code
    this.pdpFormData.emit({
        skuNumber: this.getSelectedProductCode(),
        colour: this.selectedColorVariant,
        price: this.priceCheck(),
        dimention: this.selectedFitVariant,
        size: this.selectedSizeVariant,
        name: this.products?.name,
        vaKey: vaKeyText,
        vaMandatory: this.mandatoryVA,
        selectedVaOption: this.selectedVaOption
    })
  }

  checkCustomModal(event: any) {
    this.customClicked = false;
  }

  onColorSelected(value: any) {
    if(this.sizeExchangeFlag === true){
      return;
    } 
    this.colorBoolean = false
    this.selectedColorVariant = this.products.variants.filter(
      (it: any) => it.code.code == value.code
    )[0];
    this.stockMessage = '';
    this.stockLevelNumber = 0;
    this.initDefaultSelection();
    this.deselectSize();
    if (this.isEmptyFitVariant()) {
      this.selectedFitVariant = null;
    }
    this.pdpService.colorImages.next(this.selectedColorVariant);
    this.pdpService.selectedProductCode.next(
      this.selectedColorVariant?.productCode
    );
    this.pdpForm.controls['color'].setValue(value.name);
    this.submitSkuSelection();
    this.getCustomizationAvailability()
  }

  getDefaultSelectedColor(event: any) {
    this.selectedColorVariant = this.products.variants.filter(
      (it: any) => it.code.code == event.code
    )[0];
    this.selectedFitVariant = this.selectedColorVariant?.variants[0];
    this.sizes = this.getSizes()
    this.colorBoolean = false
    this.pdpForm.controls['color'].setValue(this.selectedColorVariant.code.code);
    this.pdpForm.controls['lengthandfit'].valueChanges.subscribe(value => {
      if (value) {  // this condition checks if the user has selected a value
        this.pdpForm.controls['lengthandfit'].setValue(this.selectedFitVariant?.code?.code);
      }
    });
	  this.pdpService.colorImages.next(this.selectedColorVariant);
    this.getCustomizationAvailability()
    return true
  }

  onLengthAndFitSelected(event: MatRadioChange) {
    // this.initDefaultSelection();
    this.deselectSize();
    this.selectedFitVariant = this.dimentions.filter((it: any) =>
      it.code.code != undefined
        ? it.code.code == event.value
        : it.code == event.value
    )[0];
    this.sizes = this.getSizes()
    this.pdpForm.controls['lengthandfit'].setValue(event.value);
    this.pdpService.selectedProductCode.next(
      this.selectedFitVariant?.productCode
    );
    this.submitSkuSelection();
    this.getCustomizationAvailability()
  }

  deselectSize() {
    this.selectedSizeVariant = null;
    this.selectedSize = null;
    this.pdpForm.controls['sizes'].setValue(null);
    this.showError = false
  }

  getStockAvilability() {
    if (this.selectedSizeVariant?.stock?.stockMessage) {
      this.stockMessage = this.selectedSizeVariant?.stock?.stockMessage;
      this.stockLevelNumber = this.selectedSizeVariant?.stock?.stockLevel ?? 0;
    } else if (this.selectedFitVariant?.stock?.stockMessage) {
      this.stockMessage = this.selectedFitVariant?.stock?.stockMessage;
      this.stockLevelNumber = this.selectedFitVariant?.stock?.stockLevel ?? 0;
    } else if (this.selectedColorVariant?.stock?.stockMessage) {
      this.stockMessage = this.selectedColorVariant?.stock?.stockMessage;
      this.stockLevelNumber = this.selectedColorVariant?.stock?.stockLevel ?? 0;
    }
    if (this.stockLevelNumber > 0) {
      this.showLevel = true;
    } else {
      this.showLevel = false;
    }
  }

  // customise your product
  isVAEnabled() {
    if (this.pdpForm.get('sizes')?.value != '') {
      if (this.isEmptyFitVariant()) {
        return (this.vaEnabled = true);
      } else {
        if (this.pdpForm.get('lengthandfit')?.value != '') {
          return (this.vaEnabled = true);
        } else {
          return (this.vaEnabled = false);
        }
      }
    } else {
      return (this.vaEnabled = false);
    }
  }

  customiseProduct() {
    let showPrice = false;
    if (((this.products?.packType?.toLowerCase() == 'replacement' || this.products?.packType?.toLowerCase() == 'new starter' ||
     this.products?.packType?.toLowerCase() == 'new-starter' || this.products?.packType?.toLowerCase() == 'compulsory' ||
      this.products?.packType?.toLowerCase() == 'optional') && !this.isWearer) ||
       this.products?.packType?.toLowerCase() == 'self-purchase' || this.products?.isDollarAllocation){
        showPrice= true;
       }
    const dialogPosition: DialogPosition = {
      top: '0px',
      right: '0px',
    };
    let dialogRef = null;
    if (this.innerWidth <= 768) {
      dialogRef = this.dialog.open(CustomiseProductModalComponent, {
        minWidth: '100%',
        height: '100%',
        position: dialogPosition,
        data: this.AvailableVaOptions ? {'va': this.AvailableVaOptions,'isExchange': this.exchange, 'hidePrice': showPrice} : {},
        panelClass: ['animate__animated', 'animate__slideInRight', 'cart'],
      });
    } else {
      dialogRef = this.dialog.open(CustomiseProductModalComponent, {
        width: '900px',
        height: '100%',
        position: dialogPosition,
        data: this.AvailableVaOptions ? {'va': this.AvailableVaOptions,'isExchange': this.exchange, 'hidePrice': showPrice} : {},
        panelClass: ['animate__animated', 'animate__slideInRight', 'customiseProductModal', 'modalWidth'],
      });
    }
    dialogRef.afterClosed().subscribe((res) => {
      let resObj = JSON.stringify(res)
      if(res != undefined){
      localStorage.setItem('VAItems-' + this.products.code + '-' + this.selectedColorVariant?.code?.code, resObj);
      if (res && Object.keys(res).length > 0) {
        this.selectedVA = res?.valueAdd[0].name;
        // this.selectedVAParentKey = res?.valueAdd[0].parentKey;
        this.selectedVaOption = res;
        this.submitSkuSelection();
        this.showMandatoryVAError();
      } else {
        this.selectedVA = '';
        // this.selectedVAParentKey = '';
      }
      }
      this.cd.markForCheck();
    });
  }

  getCustomizationAvailability(){
    let dimension = '';
    if(this.selectedFitVariant?.code?.code != undefined){
      dimension = this.selectedFitVariant?.code?.code
    }
    let payload = {
      styleCode : this.products?.code,
      colourCode : this.selectedColorVariant?.code?.code,
      dimensionCode : dimension
    }
    this.store.dispatch(new FetchVAAction(payload));
  }

  deleteCustomiseProduct() {
    this.selectedVA = '';
    this.selectedVAParentKey = '';
    this.selectedVaOption = {};
    localStorage.removeItem('VAItems-' + this.products.code + '-' + this.selectedColorVariant?.code?.code);
    this.submitSkuSelection();
    this.cd.markForCheck();
  }
  showMandatoryVAError(){
    if(this.mandatoryVA && Object.keys(this.selectedVaOption).length == 0){
      this.showMandatoryCustomizationError = true;
    }else{
      this.showMandatoryCustomizationError = false;
    }
    this.cd.markForCheck();
  }

  getFileSize(value: any) {
    if (value) {
      return value / (1024 * 1024);
    }
    return 0;
  }

  getProduct(product: any) {
    if (product && product?.name) {
      return {
        ...product,
        name: product?.name?.replaceAll('/', ''),
      };
    }
    return product;
  }

  fileSizeValidator(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      const attachmentsControl = control.get('attachments');

      var files = attachmentsControl?.value;
      if (files != undefined) {
        for (var i = 0; i < files.length; i++) {
          if (this.getFileSize(files[i].size) > 30) {
            attachmentsControl?.setErrors({ fileSizeExceeds: true });
            return { fileSizeExceeds: true };
          }
          if (!this.isFileType(files[i])) {
            attachmentsControl?.setErrors({ invalidFileType: true });
            return { invalidFileType: true };
          }
        }
      }

      return null;
    };
  }

  isFileType(item: any) {
    if (this.accept.includes(item?.type)) {
      return true;
    }
    if (item?.name?.toLowerCase().includes('.heic')) {
      // Note: in crome, we are getting type as empty, so we are checking the ext of the file
      return true;
    }
    return false;
  }

  close() {
    this.dialog.closeAll()
    this.pdpService.colorImages.next({});
  }
  onCancelCustom(event:any)
  {
    this.deselectSize();
  }

  addToBundle() {
    this.showMandatoryVAError()
    this.showError = true
    if ((this.pdpForm.get('sizes')?.value != '' && this.pdpForm.get('sizes')?.value != null) && !this.showMandatoryCustomizationError)
    {
      this.showLoader = true;
      let payload = {
        productCode: this.getSelectedProductCode(),
        quantity: 1,
        // valueAdd: this.selectedVaOption
        ValueAddKey : ('VAItems-' + this.products.code + '-' + this.selectedColorVariant?.code?.code)
      }
      this.store.dispatch(new FetchAddBundleToSummaryAction(payload));
      this.store.select(addToBundleSummaryData).subscribe((res) => {
        if(res?.code == 200) {
          this.store.dispatch(new FetchBundleSummaryAction());
          this.showLoader = false
          this.dialog.closeAll()
        }else if(res?.subject){
          this.errorSubject = res?.subject;
          this.errorMessage = res?.message;
          this.disablePackCTA= true;
          this.showLoader = false
          this.showErrorDisplay = true;
        }
      })
      this.cd.markForCheck()
    }
  }

  navigateToPDP(){
    // var selectedProductCode = this.getSelectedProductCode();
    // var productCode =  selectedProductCode == '' ? this.products?.code : selectedProductCode;

    if(this.exchange == true) {
      // this.router.navigate(['product', this.products?.code, this.products.name ?? '']);
      const queryParams = { exchange: true, roleName: this.getOriginalRoleName, packType: this.getOriginalPackType, packId: this.getOriginalPackID };
      const url = this.router.serializeUrl(this.router.createUrlTree(['product', this.products?.code, this.products.name ?? ''],{ queryParams }));
      window.open(url, '_blank');
    }

  }

  generatePriceMessage(price: any, packType: any) {
    if(price != undefined && packType != null && (packType.toLowerCase() == 'replacement' && !this.isWearer || packType.toLowerCase() == 'self-purchase')) {
      
      // add VA custmization price
      let vaAmout = 0;
      if(this.selectedVaOption?.valueAdd?.length>0){        
        for(let  prompt of this.selectedVaOption?.valueAdd){
          vaAmout += +prompt?.price;
        }
      }
      let itemPrice = price?.replace(/[$,]/g, "");
      let difference = Number((this.totalPriceOfOriginalProduct) - (itemPrice * this.selectedQtyOfOriginalProduct + vaAmout));
      let message: any; 

      if(difference == 0) {
        message = '';
      } else if(difference < 0) {
        message = "By selecting this "+packType?.toLowerCase()+" item for exchange, you'll be charged an additional <strong>$"+Math.abs(difference).toFixed(2)+"</strong> at your own cost.";
      } else {
        // message = "By selecting this "+packType?.toLowerCase()+" item for exchange, you'll get refund of <strong>$"+Math.abs(difference).toFixed(2)+"</strong>.";
        message = "refund <strong>$"+Math.abs(difference).toFixed(2)+"</strong>.";
      }
      return message;
    }
    return '';
  }

  nav(){}

  priceCheck(){
    // update price if VA custmization available FLYR2-735
    let price = this.selectedSizeVariant?.price?.formattedValue != undefined ? this.selectedSizeVariant?.price?.formattedValue : this.defaultShowPrice;
    
    if(price?.includes("$") && this.selectedVaOption?.valueAdd?.length>0){
      let amount = price.replace("$", "");
          amount = parseFloat(amount.replace(",", ""));
      for(let  prompt of this.selectedVaOption?.valueAdd){
        amount += +prompt?.price;
      }
      price = '$'+ parseFloat(amount).toFixed(2);      
    }  
    return price;    
  }

  bulkOrderModal() {
    //console.log("this.products", this.products)
    const dialogPosition: DialogPosition = {
      top: '0px',
      right: '0px',
    };
    if (this.innerWidth <= 768) {
      const dialogRef = this.dialog.open(BulkOrderModalComponent, {
        minWidth: '100%',
        height: '100%',
        position: dialogPosition,
        data: {
          productCode: this.products?.code,
          productName: this.products?.name,
          itemtData: this.products?.variants,
          itemSizes: this.sizes,
          packId: this.products?.selectedPackID,
          packType: this.products?.packType,
          roleName: this.products?.roleId,
          isEmptyFitVariant: this.isEmptyFitVariant(),
          mainProduct: this.products
        },
        panelClass: ['animate__animated'],
      });
    } else {
      const dialogRef = this.dialog.open(BulkOrderModalComponent, {
        width: '900px',
        height: '100%',
        position: dialogPosition,
        data: {
          mainProduct: this.products,
          productCode: this.products?.code,
          productName: this.products?.name,
          itemtData: this.products?.variants,
          itemSizes: this.sizes,
          packId: this.products?.selectedPackID,
          packType: this.products?.packType,
          roleName: this.products?.roleId,
          isEmptyFitVariant: this.isEmptyFitVariant()
        },
        panelClass: ['animate__animated', 'animate__slideInRight','modalWidth'],
      });
    }
  }

  checkDefineValue(chkValue:any){
    if(chkValue!=undefined){
      return chkValue;
    }else{
      return '';
    }
  }

  ngOnDestroy(): void {
    this.store.dispatch(new LoadVASuccess({}));
    this.pdpService.colorImages.next({});
    this.routerSubscription.unsubscribe();
    if(this.getProductResponse!=undefined) {
      this.getProductResponse.unsubscribe()
      this.selectVADataSub.unsubscribe()
      this.store.dispatch(new SaveProductDetails({}))
      this.store.dispatch(new LoadAddToBundleSummaryAction({}))
    }
  }

  handleBulkAddToCartResp(res: any){
    if(res.error){
      this.store.dispatch(new GlobalFailureToastMsgAction(errMsg.er48));
    } else {
      this.pdpService.getCart();
      this.dialog.closeAll();
      this.openCart();
      setTimeout(()=>{
        $('html').addClass('cdk-global-scrollblock'); 
        $('html').css({left: 0, top:0});
        }, 200);
      this.store.dispatch(new LoadBulkAddToCart({}));
    }
  }

  createPayloadEmptyRule(valueAddList:any){
    let mandatoryVALength = 0;
    for(let vAdd of valueAddList){
      if(vAdd?.mandatory){
        ++mandatoryVALength;
      }
    }
    if(mandatoryVALength>1)
      this.mandatoryVAEmptyRule =false;

    // construct new payload
    if(valueAddList?.length>0 && mandatoryVALength==1){
      let valueAddArr = [];
      for(let vAdd of valueAddList){
        let promptsArr:any = [];
        for (let  prompt of vAdd?.prompts) {
          let tempObj  = {...prompt, "userEnteredValue": ''};
          delete tempObj['list']; 
          promptsArr.push(tempObj);
        }
        let promptsArrFull = {
          "parentKey": vAdd?.parentKey,
          "code": vAdd?.code,
          "name": vAdd?.name,
          "price": vAdd?.price,
          "mandatory": vAdd?.mandatory,
          "prompts": promptsArr
        }
        if(promptsArr.length > 0){
          valueAddArr.push(promptsArrFull)
        }
      }
      let vaPayload = {"valueAdd":valueAddArr};
      return vaPayload;
    }
    else
      return null;    
  }

}

enum VariantType {
  Color,
  Fit,
  Size,
}

interface Variant {
  code: Code;
  productCode: string;
  variants: Variant[];
  enabled?: boolean;
  stock?: Stock;
  price?: Price;
  images?: any;
  originalCode?: string;
}

interface Price {
  currencyIso?: string;
  formattedValue?: string;
  priceType?: string;
  value?: number;
}

interface Stock {
  isValueRounded?: boolean;
  stockLevel?: number;
  stockLevelStatus?: string;
  stockMessage?: string;
}
interface Code {
  code: string;
  name: string;
}
